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
  create(orgId: string, userId: string, input: CreateDraftInput): Promise<DraftPostOutput>;
  update(orgId: string, input: UpdateDraftInput): Promise<DraftPostOutput>;
  findById(id: string, orgId: string): Promise<DraftPostOutput>;
  listByOrganization(orgId: string): Promise<DraftPostOutput[]>;
  delete(id: string, orgId: string): Promise<void>;
  uploadMedia(orgId: string, input: UploadMediaInput): Promise<UploadMediaOutput>;
  deleteMedia(orgId: string, input: DeleteMediaInput): Promise<void>;
  publish(orgId: string, input: PublishPostInput): Promise<PublishPostOutput>;
}
