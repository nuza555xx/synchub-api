import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class RemoveMemberUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(orgId: string, userId: string): Promise<void> {
    const membership = await this.orgRepo.findMembership(orgId, userId);
    if (!membership) {
      throw new ValidationError('Member not found', EC.ORG404002);
    }
    if (membership.role === 'owner') {
      throw new ValidationError('Cannot remove organization owner', EC.ORG400003);
    }

    return this.orgRepo.removeMember(orgId, userId);
  }
}
