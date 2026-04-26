import type { BillingCycle } from '@/domain/entities/plan';
import type { OmiseSourceType } from '@/application/dto/payment.dto';

export interface ChargeResult {
  chargeId: string;
  status: 'successful' | 'pending' | 'failed';
  authorizeUri: string | null;
  omiseCustomerId: string | null;
}

export interface ScheduleResult {
  scheduleId: string;
}

export interface SourceResult {
  sourceId: string;
  type: string;
  flow: 'redirect' | 'offline';
}

export interface IPaymentGateway {
  createCustomer(params: {
    email: string;
    description: string;
    cardToken: string;
  }): Promise<{ customerId: string }>;

  createSource(params: {
    type: OmiseSourceType;
    amount: number;
    currency: string;
  }): Promise<SourceResult>;

  createChargeWithCustomer(params: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    returnUri: string;
  }): Promise<ChargeResult>;

  createChargeWithSource(params: {
    sourceId: string;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    returnUri: string;
  }): Promise<ChargeResult>;

  createSchedule(params: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    billingCycle: BillingCycle;
    startDate: string;
    endDate: string;
  }): Promise<ScheduleResult>;

  destroySchedule(scheduleId: string): Promise<void>;

  retrieveCharge(chargeId: string): Promise<{
    id: string;
    status: string;
    paid: boolean;
    metadata: Record<string, string>;
    customer: string;
  }>;

  retrieveEvent(eventId: string): Promise<{
    id: string;
    key: string;
    data: any;
  }>;
}
