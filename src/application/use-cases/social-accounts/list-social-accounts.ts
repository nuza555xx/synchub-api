import { ISocialAccountRepository } from '../../interfaces/social-account-repository';
import { SocialAccountOutput } from '../../dto/social-account.dto';

export class ListSocialAccountsUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(userId: string): Promise<SocialAccountOutput[]> {
    return this.repo.listByUser(userId);
  }
}
