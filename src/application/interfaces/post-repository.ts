import {
  CreateDraftInput,
  UpdateDraftInput,
  UploadMediaInput,
  DeleteMediaInput,
  DraftPostOutput,
  UploadMediaOutput,
} from '@/application/dto/post.dto';

export interface IDraftPostRepository {
  create(input: CreateDraftInput): Promise<DraftPostOutput>;
  update(input: UpdateDraftInput): Promise<DraftPostOutput>;
  findById(id: string, userId: string): Promise<DraftPostOutput>;
  listByUser(userId: string): Promise<DraftPostOutput[]>;
  delete(id: string, userId: string): Promise<void>;
  uploadMedia(input: UploadMediaInput): Promise<UploadMediaOutput>;
  deleteMedia(input: DeleteMediaInput): Promise<void>;
}
