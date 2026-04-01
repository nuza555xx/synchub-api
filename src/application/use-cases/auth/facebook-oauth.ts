import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { OAuthUrlOutput } from '@/application/dto/auth.dto';

export class FacebookOAuthUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(redirectTo: string): Promise<OAuthUrlOutput> {
    return this.repo.getFacebookOAuthUrl(redirectTo);
  }
}
