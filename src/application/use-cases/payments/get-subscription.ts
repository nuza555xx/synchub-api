import type { ISubscriptionRepository } from '@/application/interfaces/subscription-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { SubscriptionOutput } from '@/application/dto/payment.dto';
import { AppError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class GetSubscriptionUseCase {
  constructor(
    private readonly subRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
  ) {}

  async execute(orgId: string): Promise<SubscriptionOutput> {
    const sub = await this.subRepo.findByOrganizationId(orgId);
    if (!sub) {
      throw new AppError(EC.PAY404001, 'Subscription not found', 404);
    }

    const plan = await this.planRepo.findById(sub.planId);

    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      planName: plan?.name ?? 'unknown',
      planDisplayName: plan?.displayName ?? 'Unknown',
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAt: sub.cancelAt,
      omiseScheduleId: sub.omiseScheduleId,
    };
  }
}
