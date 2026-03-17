import { IAuthRepository } from '../../interfaces/auth-repository';
import { OAuthUrlOutput } from '../../dto/auth.dto';

export class GoogleOAuthUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(redirectTo: string): Promise<OAuthUrlOutput> {
    return this.authRepo.getGoogleOAuthUrl(redirectTo);
  }
}
