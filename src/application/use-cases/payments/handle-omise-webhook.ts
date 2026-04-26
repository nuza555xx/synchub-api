import type { ISubscriptionRepository } from '@/application/interfaces/subscription-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { IPaymentGateway } from '@/application/interfaces/payment-gateway';
import { logger } from '@/infrastructure/logger';

export class HandleOmiseWebhookUseCase {
  constructor(
    private readonly subRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(eventData: { key: string; data: any }): Promise<void> {
    const { key, data } = eventData;

    logger.info(`Omise webhook received: ${key}`, { eventId: data?.id });

    switch (key) {
      case 'charge.complete':
        await this.handleChargeComplete(data);
        break;
      case 'charge.fail':
        await this.handleChargeFailed(data);
        break;
      case 'schedule.suspend':
        await this.handleScheduleSuspended(data);
        break;
      default:
        logger.info(`Unhandled Omise event: ${key}`);
    }
  }

  private async handleChargeComplete(charge: any): Promise<void> {
    const orgId = charge.metadata?.orgId;
    const planId = charge.metadata?.planId;
    const billingCycle = charge.metadata?.billingCycle as 'monthly' | 'yearly';

    if (!orgId || !planId || !billingCycle) {
      logger.warn('Charge complete missing metadata', { chargeId: charge.id });
      return;
    }

    if (!charge.paid) {
      logger.warn('Charge complete but not paid', { chargeId: charge.id });
      return;
    }

    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      logger.warn('Plan not found for charge', { planId });
      return;
    }

    const customerId = typeof charge.customer === 'string'
      ? charge.customer
      : charge.customer?.id ?? null;

    const periodEnd = billingCycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Check if subscription already has a schedule (created synchronously in checkout)
    const existingSub = await this.subRepo.findByOrganizationId(orgId);
    let scheduleId = existingSub?.omiseScheduleId ?? null;

    // If no schedule yet and we have a customerId, create a recurring schedule
    // This handles the 3DS flow where the initial charge was pending
    if (!scheduleId && customerId) {
      try {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + (billingCycle === 'yearly' ? 365 : 30));
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 5);

        const amountSubunits = billingCycle === 'yearly'
          ? plan.omisePriceYearlyAmountSubunits
          : plan.omisePriceMonthlyAmountSubunits;

        if (amountSubunits) {
          const schedule = await this.paymentGateway.createSchedule({
            customerId,
            amount: amountSubunits,
            currency: 'thb',
            description: `${plan.displayName} (${billingCycle}) recurring`,
            billingCycle,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          });
          scheduleId = schedule.scheduleId;
          logger.info('Recurring schedule created from webhook', { orgId, scheduleId });
        }
      } catch (err) {
        logger.error('Failed to create recurring schedule from webhook', { orgId, error: err });
      }
    }

    await this.subRepo.updateSubscription(orgId, {
      planId,
      status: 'active',
      billingCycle,
      omiseCustomerId: customerId,
      omiseScheduleId: scheduleId,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAt: null,
    });

    logger.info('Subscription activated from charge.complete', { orgId, planId, billingCycle, scheduleId });
  }

  private async handleChargeFailed(charge: any): Promise<void> {
    const orgId = charge.metadata?.orgId;
    if (!orgId) {
      logger.warn('Charge failed missing orgId metadata', { chargeId: charge.id });
      return;
    }

    await this.subRepo.updateSubscription(orgId, {
      status: 'past_due',
    });

    logger.info('Subscription marked past_due from charge.fail', { orgId, chargeId: charge.id });
  }

  private async handleScheduleSuspended(schedule: any): Promise<void> {
    // When a schedule is suspended (3 failed charge retries), revert to free
    const lastCharge = schedule.charge;
    const orgId = lastCharge?.metadata?.orgId;
    if (!orgId) {
      logger.warn('Schedule suspended but no orgId found', { scheduleId: schedule.id });
      return;
    }

    const freePlan = await this.planRepo.findByName('free');
    if (!freePlan) {
      logger.error('Free plan not found — cannot downgrade');
      return;
    }

    await this.subRepo.updateSubscription(orgId, {
      planId: freePlan.id,
      status: 'canceled',
      omiseScheduleId: null,
      billingCycle: 'monthly',
      cancelAt: null,
    });

    logger.info('Subscription canceled from schedule.suspend, reverted to free', { orgId, scheduleId: schedule.id });
  }
}
