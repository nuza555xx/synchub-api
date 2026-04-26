import Router from '@koa/router';
import { ActivityLogController } from '@/interfaces/http/controllers/activity-log.controller';
import { requirePermission } from '@/interfaces/http/middleware/rbac';
import { Middleware } from 'koa';

export function createActivityLogRouter(
  controller: ActivityLogController,
  authMiddleware: Middleware,
  orgResolver: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/activity-logs' });

  router.get('/', authMiddleware, orgResolver, requirePermission('activity_log.view'), controller.list);

  return router;
}
