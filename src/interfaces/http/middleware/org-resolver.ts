import { Context, Next } from 'koa';
import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import { AppError, ForbiddenError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

/**
 * Org Resolver middleware:
 * - Reads X-Organization-Id header
 * - Verifies user is an active member of that org
 * - Loads plan for the org
 * - Sets ctx.state.organizationId, ctx.state.membership, ctx.state.plan
 */
export function createOrgResolver(
  orgRepo: IOrganizationRepository,
  planRepo: IPlanRepository,
) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const orgId = ctx.headers['x-organization-id'] as string;
    if (!orgId) {
      throw new AppError(EC.ORG400001, 'X-Organization-Id header is required', 400);
    }

    const userId = ctx.state.user?.id;
    if (!userId) {
      throw new ForbiddenError('User not authenticated', EC.AUTH401002);
    }

    const membership = await orgRepo.findMembership(orgId, userId);
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('Not a member of this organization', EC.ORG403001);
    }

    // Load org to get plan info
    const org = await orgRepo.findById(orgId);
    if (!org) {
      throw new AppError(EC.ORG404001, 'Organization not found', 404);
    }

    const plan = await planRepo.findById(org.plan.id);

    ctx.state.organizationId = orgId;
    ctx.state.membership = membership;
    ctx.state.plan = plan;

    await next();
  };
}
