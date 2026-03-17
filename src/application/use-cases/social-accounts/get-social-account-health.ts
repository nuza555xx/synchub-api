import { ISocialAccountRepository } from '../../interfaces/social-account-repository';
import { SocialAccountHealthOutput } from '../../dto/social-account.dto';

export class GetSocialAccountHealthUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(socialAccountId: string, userId: string): Promise<SocialAccountHealthOutput> {
    return this.repo.getHealth(socialAccountId, userId);
  }
}
