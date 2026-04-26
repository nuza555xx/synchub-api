import Router from '@koa/router';
import { PlanController } from '@/interfaces/http/controllers/plan.controller';

export function createPlanRouter(controller: PlanController): Router {
  const router = new Router({ prefix: '/api/v1/plans' });

  // Public endpoint — no auth needed
  router.get('/', controller.list);

  return router;
}
