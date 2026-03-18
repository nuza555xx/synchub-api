import { ISocialAccountRepository } from '@/application/interfaces/social-account-repository';
import { OAuthErrorInput } from '@/application/dto/social-account.dto';

export class HandleOAuthErrorUseCase {
  constructor(private readonly repo: ISocialAccountRepository) {}

  async execute(input: OAuthErrorInput): Promise<void> {
    return this.repo.handleOAuthError(input);
  }
}
