import { z } from 'zod';

export const connectPlatformSchema = z.object({
  platform: z.enum(['facebook', 'twitter', 'linkedin', 'tiktok'], {
    errorMap: () => ({ message: 'Invalid platform. Must be one of: facebook, twitter, linkedin, tiktok' }),
  }),
});

export const socialCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
});

export const socialAccountIdSchema = z.object({
  id: z.string().uuid('Invalid social account ID'),
});
