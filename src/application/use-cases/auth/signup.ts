import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { SignupInput, SignupOutput } from '@/application/dto/auth.dto';

export class SignupUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: SignupInput): Promise<SignupOutput> {
    return this.authRepo.signup(input);
  }
}
