import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { UploadMediaInput, UploadMediaOutput } from '@/application/dto/post.dto';

export class UploadDraftMediaUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(userId: string, input: UploadMediaInput): Promise<UploadMediaOutput> {
    return this.repo.uploadMedia(userId, input);
  }
}
