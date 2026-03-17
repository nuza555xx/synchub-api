import { IAuthRepository } from '../../interfaces/auth-repository';
import { UpdateProfileInput, UpdateProfileOutput } from '../../dto/auth.dto';

export class UpdateProfileUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(accessToken: string, input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    return this.authRepo.updateProfile(accessToken, input);
  }
}
