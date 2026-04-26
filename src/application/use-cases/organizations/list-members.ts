import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { ListMembersInput, MemberListOutput } from '@/application/dto/organization.dto';

export class ListMembersUseCase {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(orgId: string, input: ListMembersInput = {}): Promise<MemberListOutput> {
    return this.orgRepo.listMembers(orgId, input);
  }
}
