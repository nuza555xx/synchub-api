import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { UploadMediaInput, UploadMediaOutput } from '@/application/dto/post.dto';

export class UploadDraftMediaUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(input: UploadMediaInput): Promise<UploadMediaOutput> {
    return this.repo.uploadMedia(input);
  }
}
