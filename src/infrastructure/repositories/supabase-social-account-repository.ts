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
} from '@/application/dto/social-account.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { TikTokApiClient } from '@/infrastructure/external-services/tiktok-api';
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
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      likesCount: row.likes_count || 0,
      videoCount: row.video_count || 0,
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
    if (input.platform !== 'tiktok') {
      throw new AppError(EC.SOCIAL400005, `Platform "${input.platform}" is not yet supported`, 400);
    }

    const state = this.tiktokApi.generateState();

    // Store state in DB for CSRF verification
    const admin = this.supabase.getAdmin();
    await admin.from('social_oauth_states').insert({
      state,
      user_id: input.userId,
      platform: input.platform,
      created_at: new Date().toISOString(),
    });

    const authUrl = this.tiktokApi.generateAuthUrl(state, input.scopes);
    return { authUrl };
  }

  async handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput> {
    if (input.platform !== 'tiktok') {
      throw new AppError(EC.SOCIAL400005, `Platform "${input.platform}" is not yet supported`, 400);
    }

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

    // Exchange code for tokens
    const tokenData = await this.tiktokApi.exchangeCodeForToken(input.code);

    // Fetch user info
    const userInfo = await this.tiktokApi.getUserInfo(tokenData.access_token);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

    const expiresAt = new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString();
    const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const permissions = tokenData.scope ? tokenData.scope.split(',') : [];

    // Upsert social account (update if same platform + account_id exists)
    const { data: existing } = await admin
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', input.platform)
      .eq('account_id', userInfo.open_id)
      .single();

    let accountId: string;

    if (existing) {
      const { data: updated, error: updateError } = await admin
        .from('social_accounts')
        .update({
          account_name: userInfo.display_name,
          avatar_url: userInfo.avatar_url,
          username: userInfo.username,
          is_verified: userInfo.is_verified,
          followers_count: userInfo.followers_count,
          following_count: userInfo.following_count,
          likes_count: userInfo.likes_count,
          video_count: userInfo.video_count,
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

      if (updateError || !updated) {
        throw new AppError(EC.SOCIAL400003, 'Failed to update social account', 400);
      }
      accountId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('social_accounts')
        .insert({
          user_id: userId,
          platform: input.platform,
          account_id: userInfo.open_id,
          account_name: userInfo.display_name,
          avatar_url: userInfo.avatar_url,
          username: userInfo.username,
          is_verified: userInfo.is_verified,
          followers_count: userInfo.followers_count,
          following_count: userInfo.following_count,
          likes_count: userInfo.likes_count,
          video_count: userInfo.video_count,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: expiresAt,
          access_token_expires_at: accessTokenExpiresAt,
          permissions,
          connected_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        throw new AppError(EC.SOCIAL400003, 'Failed to save social account', 400);
      }
      accountId = inserted.id;
    }

    logger.info('TikTok account connected', {
      userId,
      platform: input.platform,
      accountId: userInfo.open_id,
    });

    await this.activityLog.create({
      userId,
      action: 'social_account.connect',
      resourceType: 'social_account',
      resourceId: accountId,
      details: {
        platform: input.platform,
        accountName: userInfo.display_name,
        accountId: userInfo.open_id,
      },
    });

    return {
      id: accountId,
      platform: input.platform,
      accountName: userInfo.display_name,
      tokenStatus: 'active',
    };
  }

  async refreshToken(input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput> {
    const admin = this.supabase.getAdmin();
    const { data: row, error } = await admin
      .from('social_accounts')
      .select('*')
      .eq('id', input.socialAccountId)
      .eq('user_id', input.userId)
      .single();

    if (error || !row) {
      throw new NotFoundError('Social account not found');
    }

    if (row.platform !== 'tiktok') {
      throw new AppError(EC.SOCIAL400005, `Platform "${row.platform}" is not yet supported`, 400);
    }

    const currentRefreshToken = decryptToken(row.refresh_token);
    const tokenData = await this.tiktokApi.refreshAccessToken(currentRefreshToken);

    const encryptedAccessToken = encryptToken(tokenData.access_token);
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token);
    const expiresAt = new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString();
    const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: updateError } = await admin
      .from('social_accounts')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt,
        access_token_expires_at: accessTokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.socialAccountId);

    if (updateError) {
      throw new AppError(EC.SOCIAL400004, 'Failed to update refreshed token', 400);
    }

    logger.info('TikTok token refreshed', {
      userId: input.userId,
      socialAccountId: input.socialAccountId,
    });

    await this.activityLog.create({
      userId: input.userId,
      action: 'social_account.refresh',
      resourceType: 'social_account',
      resourceId: input.socialAccountId,
      details: { platform: row.platform },
    });

    return {
      tokenStatus: 'active',
      expiresAt,
    };
  }

  async disconnect(input: DisconnectSocialInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { data: row, error: findError } = await admin
      .from('social_accounts')
      .select('id')
      .eq('id', input.socialAccountId)
      .eq('user_id', input.userId)
      .single();

    if (findError || !row) {
      throw new NotFoundError('Social account not found');
    }

    const { error } = await admin
      .from('social_accounts')
      .delete()
      .eq('id', input.socialAccountId);

    if (error) {
      throw new AppError(EC.SYS500001, error.message, 500);
    }

    logger.info('Social account disconnected', {
      userId: input.userId,
      socialAccountId: input.socialAccountId,
    });

    await this.activityLog.create({
      userId: input.userId,
      action: 'social_account.disconnect',
      resourceType: 'social_account',
      resourceId: input.socialAccountId,
    });
  }

  private computeTokenStatus(tokenExpiresAt: string | null): TokenStatus {
    if (!tokenExpiresAt) return 'active';
    return new Date(tokenExpiresAt) > new Date() ? 'active' : 'expired';
  }

  private getRequiredPermissions(platform: string): string[] {
    const permissionMap: Record<string, string[]> = {
      tiktok: ['user.info.basic', 'video.publish', 'video.list'],
      facebook: ['pages_manage_posts', 'pages_read_engagement'],
      twitter: ['tweet.read', 'tweet.write', 'users.read'],
      linkedin: ['w_member_social', 'r_liteprofile'],
    };
    return permissionMap[platform] || [];
  }
}
