import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { LoginInput, LoginOutput } from '@/application/dto/auth.dto';

export class LoginUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    return this.authRepo.login(input);
  }
}
