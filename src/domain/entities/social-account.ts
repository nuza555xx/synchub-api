export type SocialPlatform = 'facebook' | 'twitter' | 'linkedin' | 'tiktok';

export type TokenStatus = 'active' | 'expired' | 'revoked';

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  avatarUrl: string | null;
  permissions: string[];
  tokenStatus: TokenStatus;
  tokenExpiresAt: string | null;
  connectedAt: string;
}
