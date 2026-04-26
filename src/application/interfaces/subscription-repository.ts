import type { Subscription } from '@/domain/entities/plan';

export interface ISubscriptionRepository {
  findByOrganizationId(orgId: string): Promise<Subscription | null>;
  updateSubscription(orgId: string, data: Partial<Omit<Subscription, 'id' | 'organizationId' | 'createdAt'>>): Promise<Subscription>;
  updateOmiseCustomerId(orgId: string, omiseCustomerId: string): Promise<void>;
}
