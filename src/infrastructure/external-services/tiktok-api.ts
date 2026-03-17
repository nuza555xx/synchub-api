import { randomBytes } from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../domain/errors/app-error';
import * as EC from '../../domain/enums/error-codes';
import { logger } from '../logger';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url: string;
}

export class TikTokApiClient {
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientKey = env.tiktok.clientKey;
    this.clientSecret = env.tiktok.clientSecret;
    this.redirectUri = env.tiktok.redirectUri;
  }

  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user.info.basic',
      redirect_uri: this.redirectUri,
      state,
    });
    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    logger.info('TikTok token exchange request', {
      url: TIKTOK_TOKEN_URL,
      redirect_uri: this.redirectUri,
      code_length: code.length,
    });

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;

    logger.info('TikTok token exchange response', {
      status: response.status,
      data,
    });

    if (!response.ok || data.error) {
      logger.error('TikTok token exchange failed', {
        status: response.status,
        error: data,
      });
      throw new AppError(
        EC.SOCIAL400003,
        (data.error_description as string) || 'Failed to exchange TikTok authorization code',
        400,
      );
    }

    return data as unknown as TikTokTokenResponse;
  }

  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || data.error) {
      logger.error('TikTok token refresh failed', { error: data });
      throw new AppError(
        EC.SOCIAL400004,
        (data.error_description as string) || 'Failed to refresh TikTok token',
        400,
      );
    }

    return data as unknown as TikTokTokenResponse;
  }

  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const params = new URLSearchParams({
      fields: 'open_id,display_name,avatar_url',
    });

    const response = await fetch(`${TIKTOK_USER_INFO_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as Record<string, any>;
    if (!response.ok || data.error?.code) {
      logger.error('TikTok user info fetch failed', { error: data });
      throw new AppError(
        EC.SOCIAL400003,
        'Failed to fetch TikTok user info',
        400,
      );
    }

    const user = data.data?.user;
    return {
      open_id: user.open_id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    };
  }

  generateState(): string {
    return randomBytes(16).toString('hex');
  }
}
