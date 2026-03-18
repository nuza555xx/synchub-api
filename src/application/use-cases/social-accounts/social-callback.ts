import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { SocialCallbackInput, SocialCallbackOutput } from '@/application/dto/social-account.dto';

export class SocialCallbackUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: SocialCallbackInput): Promise<SocialCallbackOutput> {
    return this.repo.handleCallback(input);
  }
}
