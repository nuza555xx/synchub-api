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
  listByOrganization(orgId: string): Promise<SocialAccountOutput[]>;
  getHealth(socialAccountId: string, orgId: string): Promise<SocialAccountHealthOutput>;
  connect(userId: string, input: ConnectSocialInput): Promise<ConnectSocialOutput>;
  handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput>;
  refreshToken(orgId: string, input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput>;
  disconnect(orgId: string, userId: string, input: DisconnectSocialInput): Promise<void>;
  handleOAuthError(input: OAuthErrorInput): Promise<void>;
}
