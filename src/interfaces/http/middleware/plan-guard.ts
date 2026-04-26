import { Context, Next } from 'koa';
import type { Plan } from '@/domain/entities/plan';
import type { PlanFeature, PlanLimit } from '@/application/dto/plan.dto';
import { ForbiddenError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

/** Map plan DTO feature keys to Plan entity property names */
const FEATURE_MAP: Record<PlanFeature, keyof Plan> = {
  has_analytics: 'hasAnalytics',
  has_inbox: 'hasInbox',
  has_quick_replies: 'hasQuickReplies',
  has_hashtag_manager: 'hasHashtagManager',
  has_bulk_scheduling: 'hasBulkScheduling',
  has_activity_logs: 'hasActivityLogs',
  has_priority_support: 'hasPrioritySupport',
};

const LIMIT_MAP: Record<PlanLimit, keyof Plan> = {
  max_members: 'maxMembers',
  max_social_accounts: 'maxSocialAccounts',
  max_posts_per_month: 'maxPostsPerMonth',
  max_scheduled_posts: 'maxScheduledPosts',
  max_media_storage_mb: 'maxMediaStorageMb',
};

/**
 * Checks that the org's plan has a specific feature flag enabled.
 * Must be used AFTER org-resolver middleware (which sets ctx.state.plan).
 */
export function requirePlanFeature(feature: PlanFeature) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const plan = ctx.state.plan as Plan | undefined;
    if (!plan) {
      throw new ForbiddenError('Plan not resolved', EC.PLAN403001);
    }

    const key = FEATURE_MAP[feature];
    if (!plan[key]) {
      throw new ForbiddenError(
        `Upgrade your plan to access this feature`,
        EC.PLAN403001,
      );
    }

    await next();
  };
}

/**
 * Checks that usage hasn't exceeded a plan limit.
 * `getCurrentCount` should query the database for the current usage.
 * A plan limit of 0 means unlimited.
 * Must be used AFTER org-resolver middleware.
 */
export function checkPlanLimit(
  limit: PlanLimit,
  getCurrentCount: (orgId: string) => Promise<number>,
) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const plan = ctx.state.plan as Plan | undefined;
    if (!plan) {
      throw new ForbiddenError('Plan not resolved', EC.PLAN403002);
    }

    const key = LIMIT_MAP[limit];
    const max = plan[key] as number;

    // 0 = unlimited
    if (max > 0) {
      const orgId = ctx.state.organizationId as string;
      const current = await getCurrentCount(orgId);
      if (current >= max) {
        throw new ForbiddenError(
          `Plan limit reached: ${limit.replace(/_/g, ' ')}`,
          EC.PLAN403002,
        );
      }
    }

    await next();
  };
}
