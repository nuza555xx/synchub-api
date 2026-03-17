import { IAuthRepository } from '../../interfaces/auth-repository';
import { MeOutput } from '../../dto/auth.dto';

export class GetMeUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(accessToken: string): Promise<MeOutput> {
    return this.authRepo.getMe(accessToken);
  }
}
