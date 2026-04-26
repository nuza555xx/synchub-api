import { z } from 'zod';

const sourceTypes = [
  'promptpay',
  'truemoney',
  'internet_banking_bbl',
  'internet_banking_bay',
  'internet_banking_ktb',
  'internet_banking_scb',
  'mobile_banking_scb',
  'mobile_banking_kbank',
  'mobile_banking_bay',
  'mobile_banking_bbl',
  'mobile_banking_ktb',
] as const;

export const subscribeSchema = z
  .object({
    planId: z.string().uuid(),
    billingCycle: z.enum(['monthly', 'yearly']),
    paymentMethod: z.enum(['card', ...sourceTypes]),
    cardToken: z.string().min(1).optional(),
  })
  .refine(
    (data) => data.paymentMethod !== 'card' || !!data.cardToken,
    { message: 'cardToken is required for card payments', path: ['cardToken'] },
  );
