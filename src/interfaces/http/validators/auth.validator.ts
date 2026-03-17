import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().max(100, 'Full name must be at most 100 characters').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
}).refine((data) => data.fullName !== undefined || data.avatarUrl !== undefined, {
  message: 'At least one field must be provided',
});
