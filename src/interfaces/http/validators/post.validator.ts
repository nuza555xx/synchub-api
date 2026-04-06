import { z } from 'zod';

export const createDraftSchema = z.object({
  name: z.string().max(200).default(''),
  description: z.string().max(2000).default(''),
  content: z.string().default(''),
  mediaType: z.enum(['photo', 'video'], {
    errorMap: () => ({ message: 'mediaType must be photo or video' }),
  }),
  socialAccountIds: z.array(z.string().uuid('Invalid social account ID')).optional(),
});

export const updateDraftSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  content: z.string().optional(),
  socialAccountIds: z.array(z.string().uuid('Invalid social account ID')).optional(),
  mediaPaths: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  platformSettings: z.object({
    tiktok: z.object({
      privacyLevel: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']).optional(),
      autoAddMusic: z.boolean().optional(),
      brandContentToggle: z.boolean().optional(),
      brandOrganicToggle: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const draftIdSchema = z.object({
  id: z.string().uuid('Invalid draft ID'),
});

export const deleteMediaSchema = z.object({
  mediaPath: z.string().min(1, 'Media path is required'),
});

export const publishPostSchema = z.object({}).optional();
