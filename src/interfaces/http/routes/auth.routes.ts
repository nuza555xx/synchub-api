import Router from '@koa/router';
import { AuthController } from '@/interfaces/http/controllers/auth.controller';
import { Middleware } from 'koa';

export function createAuthRouter(controller: AuthController, authMiddleware: Middleware): Router {
  const router = new Router({ prefix: '/api/v1/auth' });

  router.post('/signup', controller.signup);
  router.post('/login', controller.login);
  router.post('/logout', authMiddleware, controller.logout);
  router.post('/refresh', controller.refresh);
  router.get('/me', authMiddleware, controller.getMe);
  router.patch('/me', authMiddleware, controller.updateProfile);
  router.get('/google', controller.googleOAuth);
  router.post('/callback', controller.oauthCallback);

  return router;
}
