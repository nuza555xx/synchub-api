import type { TypedContext } from '@/types/koa';
import { getUserId, getOrganizationId } from '@/types/context';
import { CreateOrganizationUseCase } from '@/application/use-cases/organizations/create-organization';
import { ListOrganizationsUseCase } from '@/application/use-cases/organizations/list-organizations';
import { UpdateOrganizationUseCase } from '@/application/use-cases/organizations/update-organization';
import { DeleteOrganizationUseCase } from '@/application/use-cases/organizations/delete-organization';
import { ListMembersUseCase } from '@/application/use-cases/organizations/list-members';
import { InviteMemberUseCase } from '@/application/use-cases/organizations/invite-member';
import { ChangeMemberRoleUseCase } from '@/application/use-cases/organizations/change-member-role';
import { RemoveMemberUseCase } from '@/application/use-cases/organizations/remove-member';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  changeMemberRoleSchema,
  memberUserIdSchema,
  listMembersQuerySchema,
} from '@/interfaces/http/validators/organization.validator';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class OrganizationController {
  constructor(
    private readonly createOrgUseCase: CreateOrganizationUseCase,
    private readonly listOrgsUseCase: ListOrganizationsUseCase,
    private readonly updateOrgUseCase: UpdateOrganizationUseCase,
    private readonly deleteOrgUseCase: DeleteOrganizationUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly changeMemberRoleUseCase: ChangeMemberRoleUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
  ) {}

  create = async (ctx: TypedContext<{ name: string; slug: string }>): Promise<void> => {
    const parsed = createOrganizationSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.ORG400001);
    }

    const userId = getUserId(ctx);
    const result = await this.createOrgUseCase.execute(userId, parsed.data);

    ctx.status = 201;
    ctx.body = {
      code: 'ORG201001',
      message: 'Organization created',
      result,
    };
  };

  list = async (ctx: TypedContext): Promise<void> => {
    const userId = getUserId(ctx);
    const result = await this.listOrgsUseCase.execute(userId);

    ctx.status = 200;
    ctx.body = {
      code: 'ORG200001',
      message: 'Organizations retrieved',
      result,
    };
  };

  update = async (ctx: TypedContext): Promise<void> => {
    const parsed = updateOrganizationSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.ORG400001);
    }

    const orgId = getOrganizationId(ctx);
    const result = await this.updateOrgUseCase.execute(orgId, parsed.data);

    ctx.status = 200;
    ctx.body = {
      code: 'ORG200002',
      message: 'Organization updated',
      result,
    };
  };

  delete = async (ctx: TypedContext): Promise<void> => {
    const orgId = getOrganizationId(ctx);
    await this.deleteOrgUseCase.execute(orgId);

    ctx.status = 200;
    ctx.body = {
      code: 'ORG200003',
      message: 'Organization deleted',
    };
  };

  listMembers = async (ctx: TypedContext): Promise<void> => {
    const parsed = listMembersQuerySchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.TEAM400001);
    }

    const orgId = getOrganizationId(ctx);
    const result = await this.listMembersUseCase.execute(orgId, parsed.data);

    ctx.status = 200;
    ctx.body = {
      code: 'TEAM200001',
      message: 'Members retrieved',
      result,
    };
  };

  inviteMember = async (ctx: TypedContext<{ email: string; role: string }>): Promise<void> => {
    const parsed = inviteMemberSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.TEAM400001);
    }

    const orgId = getOrganizationId(ctx);
    const userId = getUserId(ctx);
    const result = await this.inviteMemberUseCase.execute(orgId, userId, parsed.data);

    ctx.status = 201;
    ctx.body = {
      code: 'TEAM201001',
      message: 'Member invited',
      result,
    };
  };

  changeMemberRole = async (ctx: TypedContext<{ role: string }, { userId: string }>): Promise<void> => {
    const idParsed = memberUserIdSchema.safeParse({ userId: ctx.params.userId });
    if (!idParsed.success) {
      throw new ValidationError(idParsed.error.errors[0].message, EC.TEAM400001);
    }

    const bodyParsed = changeMemberRoleSchema.safeParse(ctx.request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.errors[0].message, EC.TEAM400001);
    }

    const orgId = getOrganizationId(ctx);
    const result = await this.changeMemberRoleUseCase.execute(orgId, {
      userId: idParsed.data.userId,
      role: bodyParsed.data.role,
    });

    ctx.status = 200;
    ctx.body = {
      code: 'TEAM200002',
      message: 'Member role updated',
      result,
    };
  };

  removeMember = async (ctx: TypedContext<unknown, { userId: string }>): Promise<void> => {
    const parsed = memberUserIdSchema.safeParse({ userId: ctx.params.userId });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.TEAM400001);
    }

    const orgId = getOrganizationId(ctx);
    await this.removeMemberUseCase.execute(orgId, parsed.data.userId);

    ctx.status = 200;
    ctx.body = {
      code: 'TEAM200003',
      message: 'Member removed',
    };
  };
}
