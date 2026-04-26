import type { OrgRole, MemberStatus } from '@/domain/entities/organization';

// --- Organization ---
export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  avatarUrl?: string | null;
}

export interface OrganizationOutput {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  ownerId: string;
  role?: OrgRole;
  plan: {
    id: string;
    name: string;
    displayName: string;
  };
  memberCount: number;
  createdAt: string;
}

// --- Members ---
export interface InviteMemberInput {
  email: string;
  role: OrgRole;
}

export interface ChangeMemberRoleInput {
  userId: string;
  role: OrgRole;
}

export interface OrganizationMemberOutput {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: OrgRole;
  status: MemberStatus;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface ListMembersInput {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'joinedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface MemberListOutput {
  items: OrganizationMemberOutput[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
