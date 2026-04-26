import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationOutput,
  InviteMemberInput,
  ChangeMemberRoleInput,
  OrganizationMemberOutput,
  ListMembersInput,
  MemberListOutput,
} from '@/application/dto/organization.dto';
import type { OrganizationMember } from '@/domain/entities/organization';

export interface IOrganizationRepository {
  create(ownerId: string, input: CreateOrganizationInput): Promise<OrganizationOutput>;
  findById(orgId: string): Promise<OrganizationOutput | null>;
  listByUser(userId: string): Promise<OrganizationOutput[]>;
  update(orgId: string, input: UpdateOrganizationInput): Promise<OrganizationOutput>;
  delete(orgId: string): Promise<void>;

  // Membership
  findMembership(orgId: string, userId: string): Promise<OrganizationMember | null>;
  listMembers(orgId: string, input?: ListMembersInput): Promise<MemberListOutput>;
  inviteMember(orgId: string, invitedBy: string, input: InviteMemberInput): Promise<OrganizationMemberOutput>;
  changeMemberRole(orgId: string, input: ChangeMemberRoleInput): Promise<OrganizationMemberOutput>;
  removeMember(orgId: string, userId: string): Promise<void>;

  // Counts for plan limits
  getMemberCount(orgId: string): Promise<number>;
  getSocialAccountCount(orgId: string): Promise<number>;
  getPostCountThisMonth(orgId: string): Promise<number>;
  getScheduledPostCount(orgId: string): Promise<number>;
}
