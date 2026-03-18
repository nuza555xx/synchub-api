import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { DisconnectSocialInput } from '@/application/dto/social-account.dto';

export class DisconnectSocialAccountUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: DisconnectSocialInput): Promise<void> {
    return this.repo.disconnect(input);
  }
}
