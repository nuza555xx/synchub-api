import { IAuthRepository } from '../../interfaces/auth-repository';
import { SignupInput, SignupOutput } from '../../dto/auth.dto';

export class SignupUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: SignupInput): Promise<SignupOutput> {
    return this.authRepo.signup(input);
  }
}
