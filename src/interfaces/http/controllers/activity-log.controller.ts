import type { ListActivityLogsCtx } from './types';
import { getOrganizationId } from '@/types/context';
import { ListActivityLogsUseCase } from '@/application/use-cases/activity-logs/list-activity-logs';

export class ActivityLogController {
  constructor(
    private readonly listUseCase: ListActivityLogsUseCase,
  ) {}

  list = async (ctx: ListActivityLogsCtx): Promise<void> => {
    const orgId = getOrganizationId(ctx);
    const page = ctx.query.page ? Number(ctx.query.page) : undefined;
    const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
    const action = ctx.query.action;

    const result = await this.listUseCase.execute(orgId, { page, limit, action });
    ctx.status = 200;
    ctx.body = {
      code: 'LOG200001',
      message: 'Activity logs retrieved',
      result,
    };
  };
}
