import type { ISubscriptionRepository } from '@/application/interfaces/subscription-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { IPaymentGateway } from '@/application/interfaces/payment-gateway';
import { AppError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class CancelSubscriptionUseCase {
  constructor(
    private readonly subRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(orgId: string): Promise<void> {
    const sub = await this.subRepo.findByOrganizationId(orgId);
    if (!sub) {
      throw new AppError(EC.PAY404001, 'Subscription not found', 404);
    }

    // Destroy the recurring schedule if it exists
    if (sub.omiseScheduleId) {
      try {
        await this.paymentGateway.destroySchedule(sub.omiseScheduleId);
      } catch {
        // Schedule might already be expired/deleted
      }
    }

    // Revert to free plan
    const freePlan = await this.planRepo.findByName('free');
    if (!freePlan) {
      throw new AppError(EC.PLAN404001, 'Free plan not found', 404);
    }

    await this.subRepo.updateSubscription(orgId, {
      planId: freePlan.id,
      status: 'canceled',
      omiseScheduleId: null,
      billingCycle: 'monthly',
      cancelAt: null,
    });
  }
}
