import Omise from 'omise';
import { env } from '@/config/env';
import type { IPaymentGateway, ChargeResult, ScheduleResult, SourceResult } from '@/application/interfaces/payment-gateway';
import type { BillingCycle } from '@/domain/entities/plan';
import type { OmiseSourceType } from '@/application/dto/payment.dto';

export class OmisePaymentGateway implements IPaymentGateway {
  private readonly omise: ReturnType<typeof Omise>;

  constructor() {
    this.omise = Omise({
      secretKey: env.omise.secretKey,
      omiseVersion: '2019-05-29',
    });
  }

  async createCustomer(params: {
    email: string;
    description: string;
    cardToken: string;
  }): Promise<{ customerId: string }> {
    const customer = await this.omise.customers.create({
      email: params.email,
      description: params.description,
      card: params.cardToken,
    });
    return { customerId: customer.id };
  }

  async createSource(params: {
    type: OmiseSourceType;
    amount: number;
    currency: string;
  }): Promise<SourceResult> {
    const source = await this.omise.sources.create({
      type: params.type,
      amount: params.amount,
      currency: params.currency,
    });
    return {
      sourceId: source.id,
      type: source.type,
      flow: source.flow as 'redirect' | 'offline',
    };
  }

  async createChargeWithCustomer(params: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    returnUri: string;
  }): Promise<ChargeResult> {
    const charge = await this.omise.charges.create({
      amount: params.amount,
      currency: params.currency,
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata,
      return_uri: params.returnUri,
    });

    return {
      chargeId: charge.id,
      status: charge.status as 'successful' | 'pending' | 'failed',
      authorizeUri: charge.authorize_uri ?? null,
      omiseCustomerId: params.customerId,
    };
  }

  async createChargeWithSource(params: {
    sourceId: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    returnUri: string;
  }): Promise<ChargeResult> {
    const charge = await this.omise.charges.create({
      amount: params.amount,
      currency: params.currency,
      source: params.sourceId,
      description: params.description,
      metadata: params.metadata,
      return_uri: params.returnUri,
    } as any);

    return {
      chargeId: charge.id,
      status: charge.status as 'successful' | 'pending' | 'failed',
      authorizeUri: charge.authorize_uri ?? null,
      omiseCustomerId: null,
    };
  }

  async createSchedule(params: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    billingCycle: BillingCycle;
    startDate: string;
    endDate: string;
  }): Promise<ScheduleResult> {
    const every = params.billingCycle === 'yearly' ? 12 : 1;

    const schedule = await this.omise.schedules.create({
      every,
      period: 'month',
      start_date: params.startDate,
      end_date: params.endDate,
      charge: {
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        description: params.description,
      },
    } as any);

    return { scheduleId: schedule.id };
  }

  async destroySchedule(scheduleId: string): Promise<void> {
    await this.omise.schedules.destroy(scheduleId);
  }

  async retrieveCharge(chargeId: string): Promise<{
    id: string;
    status: string;
    paid: boolean;
    metadata: Record<string, string>;
    customer: string;
  }> {
    const charge = await this.omise.charges.retrieve(chargeId);
    return {
      id: charge.id,
      status: charge.status as string,
      paid: charge.paid,
      metadata: (charge.metadata ?? {}) as Record<string, string>,
      customer: typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? '',
    };
  }

  async retrieveEvent(eventId: string): Promise<{
    id: string;
    key: string;
    data: any;
  }> {
    const event = await this.omise.events.retrieve(eventId);
    return {
      id: event.id,
      key: event.key,
      data: event.data,
    };
  }
}
