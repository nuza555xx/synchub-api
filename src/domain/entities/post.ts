export type MediaType = 'photo' | 'video';
export type DraftStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface DraftPost {
  id: string;
  userId: string;
  socialAccountIds: string[];
  name: string;
  description: string;
  content: string;
  mediaType: MediaType;
  mediaPaths: string[];
  status: DraftStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
