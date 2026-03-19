import { SocialPlatform, TokenStatus } from '@/domain/entities/social-account';

export interface ConnectSocialInput {
  userId: string;
  platform: SocialPlatform;
  redirectUri: string;
  scopes: string[];
}

export interface ConnectSocialOutput {
  authUrl: string;
}

export interface SocialCallbackInput {
  platform: SocialPlatform;
  code: string;
  state: string;
}

export interface SocialCallbackOutput {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  tokenStatus: TokenStatus;
}

export interface SocialAccountOutput {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  avatarUrl: string | null;
  username: string | null;
  isVerified: boolean;
  permissions: string[];
  tokenStatus: TokenStatus;
  tokenExpiresAt: string | null;
  connectedAt: string;
}

export interface SocialAccountHealthOutput {
  platform: SocialPlatform;
  tokenStatus: TokenStatus;
  expiresAt: string | null;
  permissions: string[];
  missingPermissions: string[];
}

export interface RefreshSocialTokenInput {
  socialAccountId: string;
  userId: string;
}

export interface RefreshSocialTokenOutput {
  tokenStatus: TokenStatus;
  expiresAt: string | null;
}

export interface DisconnectSocialInput {
  socialAccountId: string;
  userId: string;
}

export interface OAuthErrorInput {
  platform: SocialPlatform;
  state: string;
  error: string;
  errorDescription: string;
}
