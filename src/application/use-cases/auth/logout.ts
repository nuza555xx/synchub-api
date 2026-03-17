import { IAuthRepository } from '../../interfaces/auth-repository';

export class LogoutUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(accessToken: string): Promise<void> {
    return this.authRepo.logout(accessToken);
  }
}
