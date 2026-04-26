import type { OrgRole } from '@/domain/entities/organization';

/**
 * Permission map: each permission defines which roles can perform the action.
 * 0 in max_members/max_posts_per_month = unlimited (checked in plan-guard).
 */
export const PERMISSIONS = {
  // Organization
  'org.update':               ['owner', 'admin'],
  'org.delete':               ['owner'],
  'org.billing':              ['owner'],

  // Team
  'team.invite':              ['owner', 'admin'],
  'team.remove':              ['owner', 'admin'],
  'team.role.change':         ['owner', 'admin'],
  'team.view':                ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Social Accounts
  'social.connect':           ['owner', 'admin'],
  'social.disconnect':        ['owner', 'admin'],
  'social.refresh':           ['owner', 'admin'],
  'social.view':              ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Posts
  'post.create':              ['owner', 'admin', 'editor'],
  'post.update':              ['owner', 'admin', 'editor'],
  'post.delete':              ['owner', 'admin'],
  'post.publish':             ['owner', 'admin', 'editor'],
  'post.schedule':            ['owner', 'admin', 'editor'],
  'post.view':                ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Media
  'media.upload':             ['owner', 'admin', 'editor'],
  'media.delete':             ['owner', 'admin'],
  'media.view':               ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Hashtags
  'hashtag.create':           ['owner', 'admin', 'editor'],
  'hashtag.update':           ['owner', 'admin', 'editor'],
  'hashtag.delete':           ['owner', 'admin'],
  'hashtag.view':             ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Inbox / Engagement
  'inbox.reply':              ['owner', 'admin', 'moderator'],
  'inbox.hide':               ['owner', 'admin', 'moderator'],
  'inbox.delete':             ['owner', 'admin', 'moderator'],
  'inbox.view':               ['owner', 'admin', 'moderator', 'viewer'],

  // Quick Replies
  'quick_reply.create':       ['owner', 'admin', 'moderator'],
  'quick_reply.update':       ['owner', 'admin', 'moderator'],
  'quick_reply.delete':       ['owner', 'admin'],
  'quick_reply.view':         ['owner', 'admin', 'moderator'],

  // Analytics
  'analytics.view':           ['owner', 'admin', 'editor', 'moderator', 'viewer'],

  // Activity Logs
  'activity_log.view':        ['owner', 'admin'],
} as const satisfies Record<string, readonly OrgRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
