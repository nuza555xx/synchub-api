import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { SocialAccountHealthOutput } from '@/application/dto/social-account.dto';

export class GetSocialAccountHealthUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(socialAccountId: string, userId: string): Promise<SocialAccountHealthOutput> {
    return this.repo.getHealth(socialAccountId, userId);
  }
}
