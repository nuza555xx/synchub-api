import { IAuthRepository } from '../../interfaces/auth-repository';
import { LoginInput, LoginOutput } from '../../dto/auth.dto';

export class LoginUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    return this.authRepo.login(input);
  }
}
