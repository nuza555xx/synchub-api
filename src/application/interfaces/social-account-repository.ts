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

export interface ISocialAccountRepository {
  listByUser(userId: string): Promise<SocialAccountOutput[]>;
  getHealth(socialAccountId: string, userId: string): Promise<SocialAccountHealthOutput>;
  connect(userId: string, input: ConnectSocialInput): Promise<ConnectSocialOutput>;
  handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput>;
  refreshToken(userId: string, input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput>;
  disconnect(userId: string, input: DisconnectSocialInput): Promise<void>;
  handleOAuthError(input: OAuthErrorInput): Promise<void>;
}
