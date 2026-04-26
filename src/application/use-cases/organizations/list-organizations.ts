import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { OrganizationOutput } from '@/application/dto/organization.dto';

export class ListOrganizationsUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(userId: string): Promise<OrganizationOutput[]> {
    return this.orgRepo.listByUser(userId);
  }
}
