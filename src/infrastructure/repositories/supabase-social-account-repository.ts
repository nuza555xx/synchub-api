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

  async connect(input: ConnectSocialInput): Promise<ConnectSocialOutput> {
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

    // Store state in DB for CSRF verification (and PKCE if needed)
    await admin.from('social_oauth_states').insert({
      state,
      user_id: input.userId,
      platform: input.platform,
      code_verifier: codeVerifier || null,
      created_at: new Date().toISOString(),
    });

    return { authUrl };
  }

  async handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput> {
    const admin = this.supabase.getAdmin();

    // Verify state and resolve userId (no auth required on callback)
    const { data: stateRow, error: stateError } = await admin
      .from('social_oauth_states')
      .select('*')
      .eq('state', input.state)
      .single();

    if (stateError || !stateRow) {
      throw new AppError(EC.SOCIAL400003, 'Invalid or expired OAuth state', 400);
    }

    const userId: string = stateRow.user_id;

    // Clean up used state
    await admin.from('social_oauth_states').delete().eq('state', input.state);

    try {
      let tokenData: { access_token: string, refresh_token?: string, expires_in: number, refresh_expires_in?: number, scope?: string };
      let userInfo: { account_id: string, display_name: string, avatar_url: string | null, username?: string, is_verified?: boolean };

      if (input.platform === 'tiktok') {
        const tiktokTokens = await this.tiktokApi.exchangeCodeForToken(input.code);
        const tiktokUser = await this.tiktokApi.getUserInfo(tiktokTokens.access_token);
        
        tokenData = {
          access_token: tiktokTokens.access_token,
          refresh_token: tiktokTokens.refresh_token,
          expires_in: tiktokTokens.expires_in,
          refresh_expires_in: tiktokTokens.refresh_expires_in,
          scope: tiktokTokens.scope
        };
        userInfo = {
          account_id: tiktokUser.open_id,
          display_name: tiktokUser.display_name,
          avatar_url: tiktokUser.avatar_url,
          username: tiktokUser.username,
          is_verified: tiktokUser.is_verified
        };
      } else if (input.platform === 'twitter') {
        if (!stateRow.code_verifier) {
          throw new AppError(EC.SOCIAL400003, 'Missing code verifier for X (Twitter) authentication', 400);
        }
        const xTokens = await this.xApi.exchangeCodeForToken(input.code, stateRow.code_verifier);
        const xUser = await this.xApi.getUserInfo(xTokens.access_token);

        tokenData = {
          access_token: xTokens.access_token,
          refresh_token: xTokens.refresh_token,
          expires_in: xTokens.expires_in,
          scope: xTokens.scope,
        };
        userInfo = {
          account_id: xUser.id,
          display_name: xUser.name,
          avatar_url: xUser.profile_image_url || null,
          username: xUser.username,
        };
      } else if (input.platform === 'facebook') {
        // Facebook Business Login flow
        const fbShortLivedTokens = await this.facebookApi.exchangeCodeForToken(input.code);

        // Exchange short-lived token (~1 hour) for long-lived token (~60 days)
        const fbLongLivedTokens = await this.facebookApi.getLongLivedToken(fbShortLivedTokens.access_token);

        const fbUser = await this.facebookApi.getUserInfo(fbLongLivedTokens.access_token);

        // Fetch user's pages (Business Login grants page management)
        const fbPages = await this.facebookApi.getUserPages(fbLongLivedTokens.access_token);

        // Debug token to get actual granted scopes
        let grantedScopes: string[] = [];
        try {
          const tokenInfo = await this.facebookApi.debugToken(fbLongLivedTokens.access_token);
          grantedScopes = tokenInfo.scopes || [];
        } catch {
          logger.warn('Failed to debug Facebook token, continuing without scope info');
        }

        tokenData = {
          access_token: fbLongLivedTokens.access_token,
          expires_in: fbLongLivedTokens.expires_in || 5184000, 
          scope: grantedScopes.join(','),
        };
        userInfo = {
          account_id: fbUser.id,
          display_name: fbUser.name,
          avatar_url: fbUser.picture?.data.url || null,
        };

        if (fbPages.length > 0) {
          logger.info('Facebook pages found', { userId, pageCount: fbPages.length });
        }
      } else {
        throw new AppError(EC.SOCIAL400005, `Platform "${input.platform}" callback is not yet supported`, 400);
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = encryptToken(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

      const expiresAt = tokenData.refresh_expires_in 
        ? new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString()
        : (tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null);
      
      const accessTokenExpiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;
      
      const permissions = tokenData.scope ? tokenData.scope.split(input.platform === 'twitter' ? ' ' : ',') : [];

      // Upsert social account
      const { data: existing } = await admin
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', input.platform)
        .eq('account_id', userInfo.account_id)
        .single();

      let accountId: string;

      if (existing) {
        const { data: updated, error: updateError } = await admin
          .from('social_accounts')
          .update({
            account_name: userInfo.display_name,
            avatar_url: userInfo.avatar_url,
            username: userInfo.username || null,
            is_verified: userInfo.is_verified || false,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            token_expires_at: expiresAt,
            access_token_expires_at: accessTokenExpiresAt,
            permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError || !updated) throw new AppError(EC.SOCIAL400003, 'Failed to update social account', 400);
        accountId = updated.id;
      } else {
        const { data: inserted, error: insertError } = await admin
          .from('social_accounts')
          .insert({
            user_id: userId,
            platform: input.platform,
            account_id: userInfo.account_id,
            account_name: userInfo.display_name,
            avatar_url: userInfo.avatar_url,
            username: userInfo.username || null,
            is_verified: userInfo.is_verified || false,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            token_expires_at: expiresAt,
            access_token_expires_at: accessTokenExpiresAt,
            permissions,
            connected_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError || !inserted) throw new AppError(EC.SOCIAL400003, 'Failed to save social account', 400);
        accountId = inserted.id;
      }

      const isReconnect = !!existing;
      logger.info(`${input.platform} account ${isReconnect ? 'reconnected' : 'connected'}`, { userId, platform: input.platform, accountId: userInfo.account_id });

      await this.activityLog.create({
        userId,
        action: isReconnect ? 'social_account.reconnect' : 'social_account.connect',
        resourceType: 'social_account',
        resourceId: accountId,
        details: { platform: input.platform, accountName: userInfo.display_name, accountId: userInfo.account_id },
      });

      return { id: accountId, platform: input.platform as any, accountName: userInfo.display_name, tokenStatus: 'active' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      logger.error('Social account connection failed', { userId, platform: input.platform, error: errorMessage });
      await this.activityLog.create({ userId, action: 'social_account.connect_failed', resourceType: 'social_account', details: { platform: input.platform, error: errorMessage } });
      throw err;
    }
  }

  async refreshToken(input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput> {
    const admin = this.supabase.getAdmin();
    const { data: row, error } = await admin
      .from('social_accounts')
      .select('*')
      .eq('id', input.socialAccountId)
      .eq('user_id', input.userId)
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
      const encryptedRefreshToken = encryptToken(tokenData.refresh_token!);
      const expiresAt = tokenData.refresh_expires_in 
        ? new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString()
        : new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await admin.from('social_accounts').update({ access_token: encryptedAccessToken, refresh_token: encryptedRefreshToken, token_expires_at: expiresAt, access_token_expires_at: accessTokenExpiresAt, updated_at: new Date().toISOString() }).eq('id', input.socialAccountId);
      return { tokenStatus: 'active', expiresAt };
    }

    throw new AppError(EC.SOCIAL400005, `Platform "${row.platform}" refresh is not yet supported`, 400);
  }

  async disconnect(input: DisconnectSocialInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { data: row, error: findError } = await admin.from('social_accounts').select('id, platform').eq('id', input.socialAccountId).eq('user_id', input.userId).single();
    if (findError || !row) throw new NotFoundError('Social account not found');
    await admin.from('social_accounts').delete().eq('id', input.socialAccountId);
    logger.info('Social account disconnected', { userId: input.userId, socialAccountId: input.socialAccountId, platform: row.platform });
    await this.activityLog.create({ userId: input.userId, action: 'social_account.disconnect', resourceType: 'social_account', resourceId: input.socialAccountId, details: { platform: row.platform } });
  }

  async handleOAuthError(input: OAuthErrorInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { data: stateRow } = await admin.from('social_oauth_states').select('user_id').eq('state', input.state).single();
    if (stateRow) await admin.from('social_oauth_states').delete().eq('state', input.state);
    const userId = stateRow?.user_id;
    if (userId) await this.activityLog.create({ userId, action: 'social_account.connect_failed', resourceType: 'social_account', details: { platform: input.platform, error: input.error, errorDescription: input.errorDescription } });
  }

  private computeTokenStatus(tokenExpiresAt: string | null): TokenStatus {
    if (!tokenExpiresAt) return 'active';
    return new Date(tokenExpiresAt) > new Date() ? 'active' : 'expired';
  }

  private getRequiredPermissions(platform: string): string[] {
    const permissionMap: Record<string, string[]> = {
      tiktok: ['user.info.basic', 'video.publish', 'video.list'],
      facebook: ['pages_read_engagement', 'pages_manage_posts'],
      twitter: ['tweet.read', 'tweet.write', 'users.read'],
      linkedin: ['w_member_social', 'r_liteprofile'],
    };
    return permissionMap[platform] || [];
  }
}
