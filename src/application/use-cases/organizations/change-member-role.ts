import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { ChangeMemberRoleInput, OrganizationMemberOutput } from '@/application/dto/organization.dto';
import { AppError, ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class ChangeMemberRoleUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(orgId: string, input: ChangeMemberRoleInput): Promise<OrganizationMemberOutput> {
    if (input.role === 'owner') {
      throw new ValidationError('Cannot assign owner role directly', EC.ORG400004);
    }

    // Prevent changing the owner's role
    const membership = await this.orgRepo.findMembership(orgId, input.userId);
    if (!membership) {
      throw new AppError(EC.ORG404002, 'Member not found', 404);
    }
    if (membership.role === 'owner') {
      throw new ValidationError('Cannot change owner role', EC.ORG400004);
    }

    return this.orgRepo.changeMemberRole(orgId, input);
  }
}
