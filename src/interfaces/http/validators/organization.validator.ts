import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'moderator', 'viewer']),
});

export const changeMemberRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'moderator', 'viewer']),
});

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'joinedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const memberUserIdSchema = z.object({
  userId: z.string().uuid(),
});
