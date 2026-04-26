import type { Subscription } from '@/domain/entities/plan';
import type { ISubscriptionRepository } from '@/application/interfaces/subscription-repository';
import type { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { AppError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly supabase: SupabaseClientFactory) {}

  private get db() {
    return this.supabase.createServiceClient();
  }

  async findByOrganizationId(orgId: string): Promise<Subscription | null> {
    const { data } = await this.db
      .from('subscriptions')
      .select()
      .eq('organization_id', orgId)
      .single();

    return data ? this.toSubscription(data) : null;
  }

  async updateSubscription(
    orgId: string,
    data: Partial<Omit<Subscription, 'id' | 'organizationId' | 'createdAt'>>,
  ): Promise<Subscription> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (data.planId !== undefined) update.plan_id = data.planId;
    if (data.status !== undefined) update.status = data.status;
    if (data.billingCycle !== undefined) update.billing_cycle = data.billingCycle;
    if (data.currentPeriodStart !== undefined) update.current_period_start = data.currentPeriodStart;
    if (data.currentPeriodEnd !== undefined) update.current_period_end = data.currentPeriodEnd;
    if (data.cancelAt !== undefined) update.cancel_at = data.cancelAt;
    if (data.omiseScheduleId !== undefined) update.omise_schedule_id = data.omiseScheduleId;
    if (data.omiseCustomerId !== undefined) update.omise_customer_id = data.omiseCustomerId;

    const { data: row, error } = await this.db
      .from('subscriptions')
      .update(update)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error || !row) {
      throw new AppError(EC.PAY404001, 'Subscription not found', 404);
    }

    return this.toSubscription(row);
  }

  async updateOmiseCustomerId(orgId: string, omiseCustomerId: string): Promise<void> {
    await this.db
      .from('subscriptions')
      .update({ omise_customer_id: omiseCustomerId, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId);
  }

  private toSubscription(row: any): Subscription {
    return {
      id: row.id,
      organizationId: row.organization_id,
      planId: row.plan_id,
      status: row.status,
      billingCycle: row.billing_cycle,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAt: row.cancel_at,
      omiseScheduleId: row.omise_schedule_id ?? null,
      omiseCustomerId: row.omise_customer_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
