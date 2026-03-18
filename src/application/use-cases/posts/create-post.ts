import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { CreateDraftInput, DraftPostOutput } from '@/application/dto/post.dto';

export class CreateDraftPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(input: CreateDraftInput): Promise<DraftPostOutput> {
    return this.repo.create(input);
  }
}
