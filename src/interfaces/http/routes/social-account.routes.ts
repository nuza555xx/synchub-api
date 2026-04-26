import Router from '@koa/router';
import { SocialAccountController } from '@/interfaces/http/controllers/social-account.controller';
import { requirePermission } from '@/interfaces/http/middleware/rbac';
import { Middleware } from 'koa';

export function createSocialAccountRouter(
  controller: SocialAccountController,
  authMiddleware: Middleware,
  orgResolver: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/social-accounts' });

  router.get('/', authMiddleware, orgResolver, requirePermission('social.view'), controller.list);
  router.get('/:id/health', authMiddleware, orgResolver, requirePermission('social.view'), controller.getHealth);
  router.post('/connect/:platform', authMiddleware, orgResolver, requirePermission('social.connect'), controller.connect);
  router.get('/callback/:platform', controller.callback);
  router.post('/:id/refresh-token', authMiddleware, orgResolver, requirePermission('social.refresh'), controller.refreshToken);
  router.delete('/:id', authMiddleware, orgResolver, requirePermission('social.disconnect'), controller.disconnect);

  return router;
}
