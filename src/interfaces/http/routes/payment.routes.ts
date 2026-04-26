import Router from '@koa/router';
import type { Middleware } from 'koa';
import type { PaymentController } from '@/interfaces/http/controllers/payment.controller';
import { requirePermission } from '@/interfaces/http/middleware/rbac';

export function createPaymentRouter(
  controller: PaymentController,
  authMiddleware: Middleware,
  orgResolver: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1' });

  // Omise webhook — no auth needed, Omise sends JSON directly
  router.post('/payments/webhook', controller.handleWebhook);

  // Authenticated + org context endpoints
  router.post('/payments/subscribe', authMiddleware, orgResolver, requirePermission('org.billing'), controller.subscribe);
  router.post('/payments/cancel', authMiddleware, orgResolver, requirePermission('org.billing'), controller.cancelSubscription);
  router.get('/payments/subscription', authMiddleware, orgResolver, controller.getSubscription);

  return router;
}
