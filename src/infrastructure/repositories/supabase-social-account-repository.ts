import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import {
  ConnectSocialInput,
  ConnectSocialOutput,
  SocialCallbackInput,
  SocialCallbackOutput,
  SocialAccountOutput,
  SocialAccountHealthOutput,
  RefreshSocialTokenInput,
  RefreshSocialTokenOutput,
  DisconnectSocialInput,
  OAuthErrorInput,
} from '@/application/dto/social-account.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { TikTokApiClient } from '@/infrastructure/external-services/tiktok-api';
import { FacebookApiClient } from '@/infrastructure/external-services/facebook-api';
import { XApiClient } from '@/infrastructure/external-services/x-api';
import { encryptToken, decryptToken } from '@/infrastructure/encryption/aes';
import { AppError, NotFoundError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { TokenStatus } from '@/domain/entities/social-account';
import { IActivityLogRepository } from '@/application/interfaces/activity-log-repository';
import { logger } from '@/infrastructure/logger';

interface PlatformCallbackResult {
  tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    refreshExpiresIn?: number;
    scope?: string;
  };
  userInfo: {
    accountId: string;
    displayName: string;
    avatarUrl: string | null;
    username?: string;
    isVerified?: boolean;
  };
}

export class SupabaseSocialAccountRepository implements ISocialAccountRepository {
  constructor(
    private readonly supabase: SupabaseClientFactory,
    private readonly tiktokApi: TikTokApiClient,
    private readonly facebookApi: FacebookApiClient,
    private readonly xApi: XApiClient,
    private readonly activityLog: IActivityLogRepository,
  ) {}

  async listByUser(userId: string): Promise<SocialAccountOutput[]> {
    const admin = this.supabase.getAdmin();
    const { data, error } = await admin
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('connected_at', { ascending: false });

    if (error) {
      throw new AppError(EC.SYS500001, error.message, 500);
    }

    return (data || []).map((row) => ({
      id: row.id,
      platform: row.platform,
      accountName: row.account_name,
      accountId: row.account_id,
      avatarUrl: row.avatar_url,
      username: row.username || null,
      isVerified: row.is_verified || false,
      permissions: row.permissions || [],
      tokenStatus: this.computeTokenStatus(row.token_expires_at),
      tokenExpiresAt: row.token_expires_at,
      connectedAt: row.connected_at,
    }));
  }

  async getHealth(socialAccountId: string, userId: string): Promise<SocialAccountHealthOutput> {
    const admin = this.supabase.getAdmin();
    const { data: row, error } = await admin
      .from('social_accounts')
      .select('*')
      .eq('id', socialAccountId)
      .eq('user_id', userId)
      .single();

    if (error || !row) {
      throw new NotFoundError('Social account not found');
    }

    const tokenStatus = this.computeTokenStatus(row.token_expires_at);
    const requiredPermissions = this.getRequiredPermissions(row.platform);
    const currentPermissions: string[] = row.permissions || [];
    const missingPermissions = requiredPermissions.filter((p) => !currentPermissions.includes(p));

    return {
      platform: row.platform,
      tokenStatus,
      expiresAt: row.token_expires_at,
      permissions: currentPermissions,
      missingPermissions,
    };
  }

  async connect(userId: string, input: ConnectSocialInput): Promise<ConnectSocialOutput> {
    const admin = this.supabase.getAdmin();
    let state: string;
    let authUrl: string;
    let codeVerifier: string | undefined;

    if (input.platform === 'tiktok') {
      state = this.tiktokApi.generateState();
      authUrl = this.tiktokApi.generateAuthUrl(state, input.scopes);
    } else if (input.platform === 'facebook') {
      state = this.facebookApi.generateState();
      authUrl = this.facebookApi.generateAuthUrl(state, input.scopes);
    } else if (input.platform === 'twitter') {
      state = this.xApi.generateState();
      const pkce = this.xApi.generatePKCE();
      codeVerifier = pkce.verifier;
      authUrl = this.xApi.generateAuthUrl(state, pkce.challenge, input.scopes);
    } else {
      throw new AppError(EC.SOCIAL400005, `Platform "${input.platform}" is not yet supported`, 400);
    }

    await admin.from('social_oauth_states').insert({
      state,
      user_id: userId,
      platform: input.platform,
      code_verifier: codeVerifier || null,
      created_at: new Date().toISOString(),
    });

    return { authUrl };
  }

  async handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput> {
    const admin = this.supabase.getAdmin();

    const { data: stateRow, error: stateError } = await admin
      .from('social_oauth_states')
      .select('*')
      .eq('state', input.state)
      .single();

    if (stateError || !stateRow) {
      throw new AppError(EC.SOCIAL400003, 'Invalid or expired OAuth state', 400);
    }

    const userId: string = stateRow.user_id;
    await admin.from('social_oauth_states').delete().eq('state', input.state);

    try {
      let result: PlatformCallbackResult;

      switch (input.platform) {
        case 'tiktok':
          result = await this.handleTikTokCallback(input.code);
          break;
        case 'facebook':
          result = await this.handleFacebookCallback(input.code, userId);
          break;
        case 'twitter':
          if (!stateRow.code_verifier) throw new AppError(EC.SOCIAL400003, 'Missing code verifier', 400);
          result = await this.handleTwitterCallback(input.code, stateRow.code_verifier);
          break;
        default:
          throw new AppError(EC.SOCIAL400005, `Platform "${input.platform}" not supported`, 400);
      }

      const { tokenData, userInfo } = result;

      // Encrypt tokens
      const encryptedAccessToken = encryptToken(tokenData.accessToken);
      const encryptedRefreshToken = tokenData.refreshToken ? encryptToken(tokenData.refreshToken) : null;

      // Compute expiration dates
      let expiresAt: string | null = null;
      if (tokenData.refreshExpiresIn) {
        expiresAt = new Date(Date.now() + tokenData.refreshExpiresIn * 1000).toISOString();
      } else if (input.platform === 'twitter' && tokenData.refreshToken) {
        expiresAt = new Date(Date.now() + 15552000 * 1000).toISOString(); // 180 days default
      } else if (tokenData.expiresIn) {
        expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString();
      }

      const accessTokenExpiresAt = tokenData.expiresIn 
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null;

      const permissions = tokenData.scope ? tokenData.scope.split(input.platform === 'twitter' ? ' ' : ',') : [];

      // Upsert account
      const { data: existing } = await admin
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', input.platform)
        .eq('account_id', userInfo.accountId)
        .single();

      let accountId: string;
      const accountPayload = {
        account_name: userInfo.displayName,
        avatar_url: userInfo.avatarUrl,
        username: userInfo.username || null,
        is_verified: userInfo.isVerified || false,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        access_token_expires_at: accessTokenExpiresAt,
        permissions,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data: updated, error: updateError } = await admin
          .from('social_accounts')
          .update(accountPayload)
          .eq('id', existing.id)
          .select('id')
          .single();
        if (updateError || !updated) throw new AppError(EC.SOCIAL400003, 'Failed to update account', 400);
        accountId = updated.id;
      } else {
        const { data: inserted, error: insertError } = await admin
          .from('social_accounts')
          .insert({
            ...accountPayload,
            user_id: userId,
            platform: input.platform,
            account_id: userInfo.accountId,
            connected_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (insertError || !inserted) throw new AppError(EC.SOCIAL400003, 'Failed to save account', 400);
        accountId = inserted.id;
      }

      const isReconnect = !!existing;
      logger.info(`${input.platform} connected`, { userId, platform: input.platform, accountId: userInfo.accountId });

      await this.activityLog.create(userId, {
        action: isReconnect ? 'social_account.reconnect' : 'social_account.connect',
        resourceType: 'social_account',
        resourceId: accountId,
        details: { platform: input.platform, accountName: userInfo.displayName, accountId: userInfo.accountId },
      });

      return { id: accountId, platform: input.platform as any, accountName: userInfo.displayName, tokenStatus: 'active' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      logger.error('Callback failed', { userId, platform: input.platform, error: errorMessage });
      await this.activityLog.create(userId, { action: 'social_account.connect_failed', resourceType: 'social_account', details: { platform: input.platform, error: errorMessage } });
      throw err;
    }
  }

  private async handleTikTokCallback(code: string): Promise<PlatformCallbackResult> {
    const tokens = await this.tiktokApi.exchangeCodeForToken(code);
    const user = await this.tiktokApi.getUserInfo(tokens.access_token);
    return {
      tokenData: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        refreshExpiresIn: tokens.refresh_expires_in,
        scope: tokens.scope,
      },
      userInfo: {
        accountId: user.open_id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        username: user.username,
        isVerified: user.is_verified,
      },
    };
  }

  private async handleFacebookCallback(code: string, userId: string): Promise<PlatformCallbackResult> {
    const shortTokens = await this.facebookApi.exchangeCodeForToken(code);
    const longTokens = await this.facebookApi.getLongLivedToken(shortTokens.access_token);
    const user = await this.facebookApi.getUserInfo(longTokens.access_token);
    const pages = await this.facebookApi.getUserPages(longTokens.access_token);

    let grantedScopes: string[] = [];
    try {
      const tokenInfo = await this.facebookApi.debugToken(longTokens.access_token);
      grantedScopes = tokenInfo.scopes || [];
    } catch {
      logger.warn('FB scope debug failed');
    }

    if (pages.length > 0) {
      logger.info('FB pages found', { userId, count: pages.length });
    }

    return {
      tokenData: {
        accessToken: longTokens.access_token,
        expiresIn: longTokens.expires_in || 5184000,
        scope: grantedScopes.join(','),
      },
      userInfo: {
        accountId: user.id,
        displayName: user.name,
        avatarUrl: user.picture?.data.url || null,
      },
    };
  }

  private async handleTwitterCallback(code: string, verifier: string): Promise<PlatformCallbackResult> {
    const tokens = await this.xApi.exchangeCodeForToken(code, verifier);
    const user = await this.xApi.getUserInfo(tokens.access_token);
    return {
      tokenData: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
      },
      userInfo: {
        accountId: user.id,
        displayName: user.name,
        avatarUrl: user.profile_image_url || null,
        username: user.username,
      },
    };
  }

  async refreshToken(userId: string, input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput> {
    const admin = this.supabase.getAdmin();
    const { data: row, error } = await admin
      .from('social_accounts')
      .select('*')
      .eq('id', input.socialAccountId)
      .eq('user_id', userId)
      .single();

    if (error || !row) throw new NotFoundError('Social account not found');

    if (row.platform === 'facebook') {
      const currentAccessToken = decryptToken(row.access_token);
      const longLivedTokens = await this.facebookApi.getLongLivedToken(currentAccessToken);
      const encryptedAccessToken = encryptToken(longLivedTokens.access_token);
      const expiresAt = new Date(Date.now() + (longLivedTokens.expires_in || 5184000) * 1000).toISOString();

      await admin.from('social_accounts').update({ access_token: encryptedAccessToken, token_expires_at: expiresAt, access_token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('id', input.socialAccountId);
      return { tokenStatus: 'active', expiresAt };
    }

    if (row.platform === 'tiktok' || row.platform === 'twitter') {
      const currentRefreshToken = decryptToken(row.refresh_token);
      const tokenData = row.platform === 'tiktok' 
        ? await this.tiktokApi.refreshAccessToken(currentRefreshToken)
        : await this.xApi.refreshAccessToken(currentRefreshToken);

      const encryptedAccessToken = encryptToken(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;
      
      const expiresAt = (row.platform === 'tiktok' && (tokenData as any).refresh_expires_in)
        ? new Date(Date.now() + (tokenData as any).refresh_expires_in * 1000).toISOString()
        : new Date(Date.now() + 15552000 * 1000).toISOString();
      
      const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await admin.from('social_accounts').update({ 
        access_token: encryptedAccessToken, 
        refresh_token: encryptedRefreshToken, 
        token_expires_at: expiresAt, 
        access_token_expires_at: accessTokenExpiresAt, 
        updated_at: new Date().toISOString() 
      }).eq('id', input.socialAccountId);
      
      return { tokenStatus: 'active', expiresAt };
    }

    throw new AppError(EC.SOCIAL400005, `Platform "${row.platform}" refresh is not yet supported`, 400);
  }

  async disconnect(userId: string, input: DisconnectSocialInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { data: row, error: findError } = await admin.from('social_accounts').select('id, platform, access_token').eq('id', input.socialAccountId).eq('user_id', userId).single();
    if (findError || !row) throw new NotFoundError('Social account not found');

    // Revoke token with the platform before deleting (non-blocking)
    if (row.access_token) {
      try {
        const plainToken = decryptToken(row.access_token);
        if (row.platform === 'tiktok') {
          await this.tiktokApi.revokeToken(plainToken);
        } else if (row.platform === 'facebook') {
          await this.facebookApi.revokeToken(plainToken);
        } else if (row.platform === 'twitter') {
          await this.xApi.revokeToken(plainToken);
        }
      } catch (err) {
        logger.warn('Token revocation failed during disconnect (proceeding with deletion)', { platform: row.platform, error: err });
      }
    }

    await admin.from('social_accounts').delete().eq('id', input.socialAccountId);
    logger.info('Social account disconnected', { userId, socialAccountId: input.socialAccountId, platform: row.platform });
    await this.activityLog.create(userId, { action: 'social_account.disconnect', resourceType: 'social_account', resourceId: input.socialAccountId, details: { platform: row.platform, tokenRevoked: true } });
  }

  async handleOAuthError(input: OAuthErrorInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { data: stateRow } = await admin.from('social_oauth_states').select('user_id').eq('state', input.state).single();
    if (stateRow) await admin.from('social_oauth_states').delete().eq('state', input.state);
    const userId = stateRow?.user_id;
    if (userId) await this.activityLog.create(userId, { action: 'social_account.connect_failed', resourceType: 'social_account', details: { platform: input.platform, error: input.error, errorDescription: input.errorDescription } });
  }

  private computeTokenStatus(tokenExpiresAt: string | null): TokenStatus {
    if (!tokenExpiresAt) return 'active';
    return new Date(tokenExpiresAt) > new Date() ? 'active' : 'expired';
  }

  private getRequiredPermissions(platform: string): string[] {
    const permissionMap: Record<string, string[]> = {
      tiktok: ['user.info.basic', 'video.publish', 'video.list'],
      facebook: ['pages_read_engagement', 'pages_manage_posts'],
      twitter: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      linkedin: ['w_member_social', 'r_liteprofile'],
    };
    return permissionMap[platform] || [];
  }
}
