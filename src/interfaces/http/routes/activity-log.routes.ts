import Router from '@koa/router';
import { ActivityLogController } from '@/interfaces/http/controllers/activity-log.controller';
import { Middleware } from 'koa';

export function createActivityLogRouter(
  controller: ActivityLogController,
  authMiddleware: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/activity-logs' });

  router.get('/', authMiddleware, controller.list);

  return router;
}
