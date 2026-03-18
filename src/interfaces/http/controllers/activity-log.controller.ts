import { Context } from 'koa';
import { ListActivityLogsUseCase } from '../../../application/use-cases/activity-logs/list-activity-logs';

export class ActivityLogController {
  constructor(
    private readonly listUseCase: ListActivityLogsUseCase,
  ) {}

  list = async (ctx: Context): Promise<void> => {
    const userId = ctx.state.user.id as string;
    const page = ctx.query.page ? Number(ctx.query.page) : undefined;
    const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
    const action = ctx.query.action as string | undefined;

    const result = await this.listUseCase.execute({ userId, page, limit, action });
    ctx.status = 200;
    ctx.body = {
      code: 'LOG200001',
      message: 'Activity logs retrieved',
      result,
    };
  };
}
