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
  mediaUrls: z.array(z.string().url('Invalid media URL')).optional(),
});

export const draftIdSchema = z.object({
  id: z.string().uuid('Invalid draft ID'),
});

export const deleteMediaSchema = z.object({
  mediaUrl: z.string().url('Invalid media URL'),
});
