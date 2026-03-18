import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { UpdateProfileInput, UpdateProfileOutput } from '@/application/dto/auth.dto';

export class UpdateProfileUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(accessToken: string, input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    return this.authRepo.updateProfile(accessToken, input);
  }
}
