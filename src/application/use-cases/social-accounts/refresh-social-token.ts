import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { RefreshSocialTokenInput, RefreshSocialTokenOutput } from '@/application/dto/social-account.dto';

export class RefreshSocialTokenUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(orgId: string, input: RefreshSocialTokenInput): Promise<RefreshSocialTokenOutput> {
    return this.repo.refreshToken(orgId, input);
  }
}
