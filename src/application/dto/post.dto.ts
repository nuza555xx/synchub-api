import type { MediaType, DraftStatus } from '@/domain/entities/post';

export interface CreateDraftInput {
  userId: string;
  socialAccountIds?: string[];
  name?: string;
  description?: string;
  content: string;
  mediaType: MediaType;
}

export interface UpdateDraftInput {
  id: string;
  userId: string;
  socialAccountIds?: string[];
  name?: string;
  description?: string;
  content?: string;
  mediaPaths?: string[];
}

export interface UploadMediaInput {
  draftId: string;
  userId: string;
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  };
}

export interface DraftPostOutput {
  id: string;
  socialAccountIds: string[];
  name: string;
  description: string;
  content: string;
  mediaType: MediaType;
  mediaPaths: string[];
  mediaUrls: string[];
  status: DraftStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadMediaOutput {
  path: string;
}

export interface DeleteMediaInput {
  draftId: string;
  userId: string;
  mediaPath: string;
}

export interface PublishPostInput {
  postId: string;
  userId: string;
  privacyLevel?: string;
}

export interface PublishPostOutput {
  id: string;
  status: DraftStatus;
  publishedAt: string | null;
  results: PublishAccountResult[];
}

export interface PublishAccountResult {
  socialAccountId: string;
  platform: string;
  success: boolean;
  publishId?: string;
  error?: string;
}
