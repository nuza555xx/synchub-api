import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';

export class DeleteOrganizationUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(orgId: string): Promise<void> {
    return this.orgRepo.delete(orgId);
  }
}
