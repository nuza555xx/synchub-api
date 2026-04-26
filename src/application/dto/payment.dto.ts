import type { BillingCycle, SubscriptionStatus } from '@/domain/entities/plan';

export type OmiseSourceType =
  | 'promptpay'
  | 'truemoney'
  | 'internet_banking_bbl'
  | 'internet_banking_bay'
  | 'internet_banking_ktb'
  | 'internet_banking_scb'
  | 'mobile_banking_scb'
  | 'mobile_banking_kbank'
  | 'mobile_banking_bay'
  | 'mobile_banking_bbl'
  | 'mobile_banking_ktb';

export type PaymentMethod = 'card' | OmiseSourceType;

export interface SubscribeInput {
  planId: string;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  cardToken?: string;
}

export interface SubscribeOutput {
  chargeId: string;
  scheduleId: string | null;
  status: 'successful' | 'pending' | 'failed';
  authorizeUri: string | null;
}

export interface SubscriptionOutput {
  id: string;
  organizationId: string;
  planId: string;
  planName: string;
  planDisplayName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  omiseScheduleId: string | null;
}
