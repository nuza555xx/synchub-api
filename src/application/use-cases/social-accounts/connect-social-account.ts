import { ISocialAccountRepository } from '../../interfaces/social-account-repository';
import { ConnectSocialInput, ConnectSocialOutput } from '../../dto/social-account.dto';

export class ConnectSocialAccountUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: ConnectSocialInput): Promise<ConnectSocialOutput> {
    return this.repo.connect(input);
  }
}
