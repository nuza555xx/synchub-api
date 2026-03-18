import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { DraftPostOutput } from '@/application/dto/post.dto';

export class ListDraftPostsUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(userId: string): Promise<DraftPostOutput[]> {
    return this.repo.listByUser(userId);
  }
}
