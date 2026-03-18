import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { SocialAccountOutput } from '@/application/dto/social-account.dto';

export class ListSocialAccountsUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(userId: string): Promise<SocialAccountOutput[]> {
    return this.repo.listByUser(userId);
  }
}
