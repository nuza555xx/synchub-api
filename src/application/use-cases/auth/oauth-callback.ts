import { IAuthRepository } from '../../interfaces/auth-repository';
import { OAuthCallbackInput, OAuthCallbackOutput } from '../../dto/auth.dto';

export class OAuthCallbackUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: OAuthCallbackInput): Promise<OAuthCallbackOutput> {
    return this.authRepo.exchangeOAuthCode(input);
  }
}
