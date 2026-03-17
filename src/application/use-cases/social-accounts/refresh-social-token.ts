import { ISocialAccountRepository } from '../../interfaces/social-account-repository';
import { RefreshSocialTokenInput, RefreshSocialTokenOutput } from '../../dto/social-account.dto';

export class RefreshSocialTokenUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput> {
    return this.repo.refreshToken(input);
  }
}
