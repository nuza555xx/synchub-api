import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { DeleteMediaInput } from '@/application/dto/post.dto';

export class DeleteDraftMediaUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(input: DeleteMediaInput): Promise<void> {
    return this.repo.deleteMedia(input);
  }
}
