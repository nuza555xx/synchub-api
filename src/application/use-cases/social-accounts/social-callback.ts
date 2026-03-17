import { ISocialAccountRepository } from '../../interfaces/social-account-repository';
import { SocialCallbackInput, SocialCallbackOutput } from '../../dto/social-account.dto';

export class SocialCallbackUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: SocialCallbackInput): Promise<SocialCallbackOutput> {
    return this.repo.handleCallback(input);
  }
}
