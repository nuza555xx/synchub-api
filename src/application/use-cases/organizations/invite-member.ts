import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { InviteMemberInput, OrganizationMemberOutput } from '@/application/dto/organization.dto';
import { AppError, ForbiddenError, ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class InviteMemberUseCase {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly planRepo: IPlanRepository,
  ) {}

  async execute(orgId: string, invitedBy: string, input: InviteMemberInput): Promise<OrganizationMemberOutput> {
    if (!input.email?.trim()) {
      throw new ValidationError('Email is required', EC.TEAM400001);
    }
    if (input.role === 'owner') {
      throw new ValidationError('Cannot invite as owner', EC.TEAM400001);
    }

    // Check plan limit
    const org = await this.orgRepo.findById(orgId);
    if (!org) throw new AppError(EC.ORG404001, 'Organization not found', 404);

    const plan = await this.planRepo.findById(org.plan.id);
    if (plan && plan.maxMembers > 0) {
      const currentCount = await this.orgRepo.getMemberCount(orgId);
      if (currentCount >= plan.maxMembers) {
        throw new ForbiddenError('Plan limit reached: max members', EC.TEAM400003);
      }
    }

    return this.orgRepo.inviteMember(orgId, invitedBy, input);
  }
}
