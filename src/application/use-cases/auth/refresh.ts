import { IAuthRepository } from '../../interfaces/auth-repository';
import { RefreshInput, RefreshOutput } from '../../dto/auth.dto';

export class RefreshUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: RefreshInput): Promise<RefreshOutput> {
    return this.authRepo.refresh(input);
  }
}
