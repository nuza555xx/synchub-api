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
} from '../dto/social-account.dto';

export interface ISocialAccountRepository {
  listByUser(userId: string): Promise<SocialAccountOutput[]>;
  getHealth(socialAccountId: string, userId: string): Promise<SocialAccountHealthOutput>;
  connect(input: ConnectSocialInput): Promise<ConnectSocialOutput>;
  handleCallback(input: SocialCallbackInput): Promise<SocialCallbackOutput>;
  refreshToken(input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput>;
  disconnect(input: DisconnectSocialInput): Promise<void>;
}
