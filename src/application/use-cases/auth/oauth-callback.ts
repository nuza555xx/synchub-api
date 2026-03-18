import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { OAuthCallbackInput, OAuthCallbackOutput } from '@/application/dto/auth.dto';

export class OAuthCallbackUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: OAuthCallbackInput): Promise<OAuthCallbackOutput> {
    return this.authRepo.exchangeOAuthCode(input);
  }
}
