import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { UpdateDraftInput, DraftPostOutput } from '@/application/dto/post.dto';

export class UpdateDraftPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(orgId: string, input: UpdateDraftInput): Promise<DraftPostOutput> {
    return this.repo.update(orgId, input);
  }
}
