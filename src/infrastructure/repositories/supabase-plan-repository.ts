import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { PlanOutput } from '@/application/dto/plan.dto';
import type { Plan } from '@/domain/entities/plan';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';

export class SupabasePlanRepository implements IPlanRepository {
  constructor(private readonly supabase: SupabaseClientFactory) {}

  private get db() {
    return this.supabase.createServiceClient();
  }

  async list(): Promise<PlanOutput[]> {
    const { data } = await this.db
      .from('plans')
      .select()
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return (data ?? []).map(this.toPlanOutput);
  }

  async findById(planId: string): Promise<Plan | null> {
    const { data } = await this.db
      .from('plans')
      .select()
      .eq('id', planId)
      .single();

    return data ? this.toPlan(data) : null;
  }

  async findByName(name: string): Promise<Plan | null> {
    const { data } = await this.db
      .from('plans')
      .select()
      .eq('name', name)
      .single();

    return data ? this.toPlan(data) : null;
  }

  private toPlan(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      maxMembers: row.max_members,
      maxWorkspaces: row.max_workspaces,
      maxSocialAccounts: row.max_social_accounts,
      maxPostsPerMonth: row.max_posts_per_month,
      maxScheduledPosts: row.max_scheduled_posts,
      maxMediaStorageMb: row.max_media_storage_mb,
      hasAnalytics: row.has_analytics,
      hasInbox: row.has_inbox,
      hasQuickReplies: row.has_quick_replies,
      hasHashtagManager: row.has_hashtag_manager,
      hasBulkScheduling: row.has_bulk_scheduling,
      hasActivityLogs: row.has_activity_logs,
      hasPrioritySupport: row.has_priority_support,
      allowedPlatforms: row.allowed_platforms,
      priceMonthly: Number(row.price_monthly),
      priceYearly: Number(row.price_yearly),
      omisePriceMonthlyAmountSubunits: row.omise_price_monthly_amount_subunits ?? null,
      omisePriceYearlyAmountSubunits: row.omise_price_yearly_amount_subunits ?? null,
      isActive: row.is_active,
      sortOrder: row.sort_order,
    };
  }

  private toPlanOutput(row: any): PlanOutput {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      maxMembers: row.max_members,
      maxWorkspaces: row.max_workspaces,
      maxSocialAccounts: row.max_social_accounts,
      maxPostsPerMonth: row.max_posts_per_month,
      maxScheduledPosts: row.max_scheduled_posts,
      maxMediaStorageMb: row.max_media_storage_mb,
      hasAnalytics: row.has_analytics,
      hasInbox: row.has_inbox,
      hasQuickReplies: row.has_quick_replies,
      hasHashtagManager: row.has_hashtag_manager,
      hasBulkScheduling: row.has_bulk_scheduling,
      hasActivityLogs: row.has_activity_logs,
      hasPrioritySupport: row.has_priority_support,
      allowedPlatforms: row.allowed_platforms,
      priceMonthly: Number(row.price_monthly),
      priceYearly: Number(row.price_yearly),
    };
  }
}
