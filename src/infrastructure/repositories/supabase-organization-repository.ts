import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
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
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { AppError, NotFoundError, ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class SupabaseOrganizationRepository implements IOrganizationRepository {
  constructor(
    private readonly supabase: SupabaseClientFactory,
    private readonly planRepo: IPlanRepository,
  ) {}

  private get db() {
    return this.supabase.createServiceClient();
  }

  async create(ownerId: string, input: CreateOrganizationInput): Promise<OrganizationOutput> {
    const freePlan = await this.planRepo.findByName('free');
    if (!freePlan) throw new AppError(EC.PLAN404001, 'Default plan not found', 500);

    // Create organization
    const { data: org, error: orgErr } = await this.db
      .from('organizations')
      .insert({ name: input.name, slug: input.slug, owner_id: ownerId })
      .select()
      .single();

    if (orgErr) {
      if (orgErr.code === '23505') throw new ValidationError('Slug already taken', EC.ORG400002);
      throw new AppError(EC.ORG400001, orgErr.message, 400);
    }

    // Add owner as member
    await this.db
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: ownerId,
        role: 'owner',
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

    // Create free subscription
    await this.db
      .from('subscriptions')
      .insert({
        organization_id: org.id,
        plan_id: freePlan.id,
      });

    return this.toOrganizationOutput(org, freePlan.displayName, freePlan.id, freePlan.name, 1);
  }

  async findById(orgId: string): Promise<OrganizationOutput | null> {
    const { data: org } = await this.db
      .from('organizations')
      .select('*, subscriptions(plan_id, plans(id, name, display_name))')
      .eq('id', orgId)
      .single();

    if (!org) return null;

    const memberCount = await this.getMemberCount(orgId);
    const sub = (org as any).subscriptions?.[0];
    const plan = sub?.plans;

    return this.toOrganizationOutput(
      org,
      plan?.display_name ?? 'Free',
      plan?.id ?? '',
      plan?.name ?? 'free',
      memberCount,
    );
  }

  async listByUser(userId: string): Promise<OrganizationOutput[]> {
    // Find all orgs user is a member of (include role)
    const { data: memberships } = await this.db
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!memberships?.length) return [];

    const orgIds = memberships.map((m: any) => m.organization_id);
    const roleMap = new Map(memberships.map((m: any) => [m.organization_id, m.role]));

    const { data: orgs } = await this.db
      .from('organizations')
      .select('*, subscriptions(plan_id, plans(id, name, display_name))')
      .in('id', orgIds)
      .order('created_at', { ascending: true });

    if (!orgs?.length) return [];

    const results: OrganizationOutput[] = [];
    for (const org of orgs) {
      const memberCount = await this.getMemberCount(org.id);
      const sub = (org as any).subscriptions?.[0];
      const plan = sub?.plans;
      const output = this.toOrganizationOutput(org, plan?.display_name ?? 'Free', plan?.id ?? '', plan?.name ?? 'free', memberCount);
      output.role = roleMap.get(org.id);
      results.push(output);
    }
    return results;
  }

  async update(orgId: string, input: UpdateOrganizationInput): Promise<OrganizationOutput> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;

    const { error } = await this.db
      .from('organizations')
      .update(updateData)
      .eq('id', orgId);

    if (error) {
      if (error.code === '23505') throw new ValidationError('Slug already taken', EC.ORG400002);
      throw new AppError(EC.ORG400001, error.message, 400);
    }

    const org = await this.findById(orgId);
    if (!org) throw new NotFoundError('Organization not found');
    return org;
  }

  async delete(orgId: string): Promise<void> {
    const { error } = await this.db
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) throw new AppError(EC.ORG400001, error.message, 400);
  }

  // --- Membership ---

  async findMembership(orgId: string, userId: string): Promise<OrganizationMember | null> {
    const { data } = await this.db
      .from('organization_members')
      .select()
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      role: data.role,
      status: data.status,
      invitedBy: data.invited_by,
      invitedAt: data.invited_at,
      acceptedAt: data.accepted_at,
      createdAt: data.created_at,
    };
  }

  async listMembers(orgId: string, input: ListMembersInput = {}): Promise<MemberListOutput> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 10, 100);
    const sortBy = input.sortBy || 'name';
    const sortOrder = input.sortOrder || 'asc';
    const search = input.search?.trim().toLowerCase();

    // 1. Fetch ALL members for this org (typically small set)
    const { data: members } = await this.db
      .from('organization_members')
      .select()
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (!members?.length) {
      return { items: [], meta: { page, limit, total: 0 } };
    }

    // 2. Fetch user profiles
    const adminClient = this.supabase.createAdminClient();
    let results: OrganizationMemberOutput[] = [];

    for (const m of members) {
      const { data: { user } } = await adminClient.auth.admin.getUserById(m.user_id);
      results.push({
        id: m.id,
        userId: m.user_id,
        email: user?.email ?? '',
        fullName: (user?.user_metadata?.full_name as string) || null,
        avatarUrl: (user?.user_metadata?.avatar_url as string) || null,
        role: m.role,
        status: m.status,
        invitedAt: m.invited_at,
        acceptedAt: m.accepted_at,
      });
    }

    // 3. Search filter (name or email)
    if (search) {
      results = results.filter(
        (m) =>
          (m.fullName?.toLowerCase().includes(search)) ||
          m.email.toLowerCase().includes(search),
      );
    }

    // 4. Sort
    const ascending = sortOrder === 'asc';
    results.sort((a, b) => {
      let valA: string;
      let valB: string;
      switch (sortBy) {
        case 'email':
          valA = a.email;
          valB = b.email;
          break;
        case 'role':
          valA = a.role;
          valB = b.role;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'joinedAt':
          valA = a.acceptedAt || a.invitedAt;
          valB = b.acceptedAt || b.invitedAt;
          break;
        case 'name':
        default:
          valA = (a.fullName || a.email).toLowerCase();
          valB = (b.fullName || b.email).toLowerCase();
          break;
      }
      const cmp = valA.localeCompare(valB);
      return ascending ? cmp : -cmp;
    });

    // 5. Paginate
    const total = results.length;
    const offset = (page - 1) * limit;
    const items = results.slice(offset, offset + limit);

    return { items, meta: { page, limit, total } };
  }

  async inviteMember(orgId: string, invitedBy: string, input: InviteMemberInput): Promise<OrganizationMemberOutput> {
    // Find user by email
    const adminClient = this.supabase.createAdminClient();
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const targetUser = users.find(u => u.email === input.email);

    if (!targetUser) {
      throw new ValidationError('User not found with this email', EC.TEAM404001);
    }

    // Check if already a member
    const existing = await this.findMembership(orgId, targetUser.id);
    if (existing) {
      throw new ValidationError('User is already a member', EC.TEAM400002);
    }

    const { data, error } = await this.db
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: targetUser.id,
        role: input.role,
        invited_by: invitedBy,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(EC.TEAM400001, error.message, 400);

    return {
      id: data.id,
      userId: data.user_id,
      email: targetUser.email ?? '',
      fullName: (targetUser.user_metadata?.full_name as string) || null,
      avatarUrl: (targetUser.user_metadata?.avatar_url as string) || null,
      role: data.role,
      status: data.status,
      invitedAt: data.invited_at,
      acceptedAt: data.accepted_at,
    };
  }

  async changeMemberRole(orgId: string, input: ChangeMemberRoleInput): Promise<OrganizationMemberOutput> {
    const { error } = await this.db
      .from('organization_members')
      .update({ role: input.role })
      .eq('organization_id', orgId)
      .eq('user_id', input.userId);

    if (error) throw new AppError(EC.ORG400001, error.message, 400);

    // Re-fetch with user info
    const { items } = await this.listMembers(orgId);
    const member = items.find(m => m.userId === input.userId);
    if (!member) throw new NotFoundError('Member not found');
    return member;
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw new AppError(EC.ORG400001, error.message, 400);
  }

  // --- Plan limit counts ---

  async getMemberCount(orgId: string): Promise<number> {
    const { count } = await this.db
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .in('status', ['active', 'pending']);

    return count ?? 0;
  }

  async getSocialAccountCount(orgId: string): Promise<number> {
    const { count } = await this.db
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    return count ?? 0;
  }

  async getPostCountThisMonth(orgId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count } = await this.db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', startOfMonth);

    return count ?? 0;
  }

  async getScheduledPostCount(orgId: string): Promise<number> {
    const { count } = await this.db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'scheduled');

    return count ?? 0;
  }

  // --- Helpers ---

  private toOrganizationOutput(
    org: any,
    planDisplayName: string,
    planId: string,
    planName: string,
    memberCount: number,
  ): OrganizationOutput {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      avatarUrl: org.avatar_url ?? null,
      ownerId: org.owner_id,
      plan: {
        id: planId,
        name: planName,
        displayName: planDisplayName,
      },
      memberCount,
      createdAt: org.created_at,
    };
  }
}
