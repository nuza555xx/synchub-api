import type { Plan } from '@/domain/entities/plan';

export interface PlanOutput {
  id: string;
  name: string;
  displayName: string;
  maxMembers: number;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  maxScheduledPosts: number;
  maxMediaStorageMb: number;
  hasAnalytics: boolean;
  hasInbox: boolean;
  hasQuickReplies: boolean;
  hasHashtagManager: boolean;
  hasBulkScheduling: boolean;
  hasActivityLogs: boolean;
  hasPrioritySupport: boolean;
  allowedPlatforms: string[];
  priceMonthly: number;
  priceYearly: number;
}

export type PlanFeature =
  | 'has_analytics'
  | 'has_inbox'
  | 'has_quick_replies'
  | 'has_hashtag_manager'
  | 'has_bulk_scheduling'
  | 'has_activity_logs'
  | 'has_priority_support';

export type PlanLimit =
  | 'max_members'
  | 'max_social_accounts'
  | 'max_posts_per_month'
  | 'max_scheduled_posts'
  | 'max_media_storage_mb';
