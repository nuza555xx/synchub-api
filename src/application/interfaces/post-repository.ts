import {
  CreateDraftInput,
  UpdateDraftInput,
  UploadMediaInput,
  DeleteMediaInput,
  DraftPostOutput,
  UploadMediaOutput,
  PublishPostInput,
  PublishPostOutput,
} from '@/application/dto/post.dto';

export interface IDraftPostRepository {
  create(userId: string, input: CreateDraftInput): Promise<DraftPostOutput>;
  update(userId: string, input: UpdateDraftInput): Promise<DraftPostOutput>;
  findById(id: string, userId: string): Promise<DraftPostOutput>;
  listByUser(userId: string): Promise<DraftPostOutput[]>;
  delete(id: string, userId: string): Promise<void>;
  uploadMedia(userId: string, input: UploadMediaInput): Promise<UploadMediaOutput>;
  deleteMedia(userId: string, input: DeleteMediaInput): Promise<void>;
  publish(userId: string, input: PublishPostInput): Promise<PublishPostOutput>;
}
