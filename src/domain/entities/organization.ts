export type OrgRole = 'owner' | 'admin' | 'editor' | 'moderator' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'suspended';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  status: MemberStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
}
