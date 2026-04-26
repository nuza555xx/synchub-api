import type { ISubscriptionRepository } from '@/application/interfaces/subscription-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { IPaymentGateway } from '@/application/interfaces/payment-gateway';
import type { SubscribeInput, SubscribeOutput } from '@/application/dto/payment.dto';
import { AppError, ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { env } from '@/config/env';

export class SubscribeUseCase {
  constructor(
    private readonly subRepo: ISubscriptionRepository,
    private readonly planRepo: IPlanRepository,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(orgId: string, userEmail: string, input: SubscribeInput): Promise<SubscribeOutput> {
    const plan = await this.planRepo.findById(input.planId);
    if (!plan) {
      throw new AppError(EC.PLAN404001, 'Plan not found', 404);
    }

    if (plan.name === 'free') {
      throw new ValidationError('Cannot subscribe to a free plan', EC.PAY400001);
    }

    const amountSubunits = input.billingCycle === 'yearly'
      ? plan.omisePriceYearlyAmountSubunits
      : plan.omisePriceMonthlyAmountSubunits;

    if (!amountSubunits) {
      throw new AppError(EC.PAY400002, 'Price not configured for this plan', 400);
    }

    const sub = await this.subRepo.findByOrganizationId(orgId);
    if (sub && sub.planId === input.planId && sub.status === 'active') {
      throw new ValidationError('Already on this plan', EC.PAY400004);
    }

    // If there's an existing schedule, cancel it
    if (sub?.omiseScheduleId) {
      try {
        await this.paymentGateway.destroySchedule(sub.omiseScheduleId);
      } catch {
        // Schedule might already be expired/deleted
      }
    }

    const returnUri = `${env.frontendUrl}/pricing?checkout=success`;

    if (input.paymentMethod === 'card') {
      return this.handleCardPayment(orgId, userEmail, input, amountSubunits, sub?.omiseCustomerId ?? null, returnUri);
    }

    return this.handleSourcePayment(orgId, input, amountSubunits, returnUri);
  }

  private async handleCardPayment(
    orgId: string,
    userEmail: string,
    input: SubscribeInput,
    amountSubunits: number,
    existingCustomerId: string | null,
    returnUri: string,
  ): Promise<SubscribeOutput> {
    const plan = (await this.planRepo.findById(input.planId))!;

    // Create or reuse Omise customer
    let customerId = existingCustomerId;
    if (!customerId) {
      const customer = await this.paymentGateway.createCustomer({
        email: userEmail,
        description: `Organization ${orgId}`,
        cardToken: input.cardToken!,
      });
      customerId = customer.customerId;
    }

    // Create an initial charge
    const chargeResult = await this.paymentGateway.createChargeWithCustomer({
      customerId,
      amount: amountSubunits,
      currency: 'thb',
      description: `${plan.displayName} (${input.billingCycle})`,
      metadata: {
        orgId,
        planId: input.planId,
        billingCycle: input.billingCycle,
      },
      returnUri,
    });

    // Create a recurring schedule
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + (input.billingCycle === 'yearly' ? 365 : 30));
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 5);

    let scheduleId: string | null = null;
    if (chargeResult.status === 'successful') {
      const schedule = await this.paymentGateway.createSchedule({
        customerId,
        amount: amountSubunits,
        currency: 'thb',
        description: `${plan.displayName} (${input.billingCycle}) recurring`,
        billingCycle: input.billingCycle,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      scheduleId = schedule.scheduleId;

      const periodEnd = input.billingCycle === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await this.subRepo.updateSubscription(orgId, {
        planId: input.planId,
        status: 'active',
        billingCycle: input.billingCycle,
        omiseScheduleId: scheduleId,
        omiseCustomerId: customerId,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAt: null,
      });
    }

    return {
      chargeId: chargeResult.chargeId,
      scheduleId,
      status: chargeResult.status,
      authorizeUri: chargeResult.authorizeUri,
    };
  }

  private async handleSourcePayment(
    orgId: string,
    input: SubscribeInput,
    amountSubunits: number,
    returnUri: string,
  ): Promise<SubscribeOutput> {
    const plan = (await this.planRepo.findById(input.planId))!;

    // Create Omise source (PromptPay, banking, etc.)
    const source = await this.paymentGateway.createSource({
      type: input.paymentMethod as Exclude<typeof input.paymentMethod, 'card'>,
      amount: amountSubunits,
      currency: 'thb',
    });

    // Create charge with source — results in redirect or offline flow
    const chargeResult = await this.paymentGateway.createChargeWithSource({
      sourceId: source.sourceId,
      amount: amountSubunits,
      currency: 'thb',
      description: `${plan.displayName} (${input.billingCycle})`,
      metadata: {
        orgId,
        planId: input.planId,
        billingCycle: input.billingCycle,
      },
      returnUri,
    });

    // Source payments are always pending — webhook will activate subscription
    return {
      chargeId: chargeResult.chargeId,
      scheduleId: null,
      status: chargeResult.status,
      authorizeUri: chargeResult.authorizeUri,
    };
  }
}
