import { IAuthRepository } from '@/application/interfaces/auth-repository';
import { RefreshInput, RefreshOutput } from '@/application/dto/auth.dto';

export class RefreshUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: RefreshInput): Promise<RefreshOutput> {
    return this.authRepo.refresh(input);
  }
}
