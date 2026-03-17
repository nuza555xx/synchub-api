import Router from '@koa/router';
import { SocialAccountController } from '../controllers/social-account.controller';
import { Middleware } from 'koa';

export function createSocialAccountRouter(
  controller: SocialAccountController,
  authMiddleware: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/social-accounts' });

  router.get('/', authMiddleware, controller.list);
  router.get('/:id/health', authMiddleware, controller.getHealth);
  router.post('/connect/:platform', authMiddleware, controller.connect);
  router.get('/callback/:platform', authMiddleware, controller.callback);
  router.post('/:id/refresh-token', authMiddleware, controller.refreshToken);
  router.delete('/:id', authMiddleware, controller.disconnect);

  return router;
}
