export type MediaType = 'photo' | 'video';
export type DraftStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface PlatformSettings {
  tiktok?: {
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
    autoAddMusic?: boolean;
    brandContentToggle?: boolean;
    brandOrganicToggle?: boolean;
  };
}

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
  platformSettings: PlatformSettings;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
