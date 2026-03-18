import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { DraftPostOutput } from '@/application/dto/post.dto';

export class GetDraftPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(id: string, userId: string): Promise<DraftPostOutput> {
    return this.repo.findById(id, userId);
  }
}
