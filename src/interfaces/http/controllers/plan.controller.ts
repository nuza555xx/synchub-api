import type { TypedContext } from '@/types/koa';
import { ListPlansUseCase } from '@/application/use-cases/plans/list-plans';

export class PlanController {
  constructor(private readonly listPlansUseCase: ListPlansUseCase) {}

  list = async (ctx: TypedContext): Promise<void> => {
    const result = await this.listPlansUseCase.execute();

    ctx.status = 200;
    ctx.body = {
      code: 'PLAN200001',
      message: 'Plans retrieved',
      result,
    };
  };
}
