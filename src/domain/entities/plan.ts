export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type BillingCycle = 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  maxMembers: number;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  maxScheduledPosts: number;
  maxMediaStorageMb: number;
  hasAnalytics: boolean;
  hasInbox: boolean;
  hasQuickReplies: boolean;
  hasHashtagManager: boolean;
  hasBulkScheduling: boolean;
  hasActivityLogs: boolean;
  hasPrioritySupport: boolean;
  allowedPlatforms: string[];
  priceMonthly: number;
  priceYearly: number;
  omisePriceMonthlyAmountSubunits: number | null;
  omisePriceYearlyAmountSubunits: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  omiseScheduleId: string | null;
  omiseCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}
