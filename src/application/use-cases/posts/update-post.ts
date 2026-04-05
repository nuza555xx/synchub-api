import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { UpdateDraftInput, DraftPostOutput } from '@/application/dto/post.dto';

export class UpdateDraftPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(userId: string, input: UpdateDraftInput): Promise<DraftPostOutput> {
    return this.repo.update(userId, input);
  }
}
