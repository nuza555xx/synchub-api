import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { UpdateOrganizationInput, OrganizationOutput } from '@/application/dto/organization.dto';

export class UpdateOrganizationUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(orgId: string, input: UpdateOrganizationInput): Promise<OrganizationOutput> {
    return this.orgRepo.update(orgId, input);
  }
}
