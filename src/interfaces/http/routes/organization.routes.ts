import Router from '@koa/router';
import { OrganizationController } from '@/interfaces/http/controllers/organization.controller';
import { requirePermission } from '@/interfaces/http/middleware/rbac';
import { Middleware } from 'koa';

export function createOrganizationRouter(
  controller: OrganizationController,
  authMiddleware: Middleware,
  orgResolver: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1' });

  // Org CRUD (auth only, no org context needed for list/create)
  router.get('/organizations', authMiddleware, controller.list);
  router.post('/organizations', authMiddleware, controller.create);

  // Org operations (need org context)
  router.patch('/organizations', authMiddleware, orgResolver, requirePermission('org.update'), controller.update);
  router.delete('/organizations', authMiddleware, orgResolver, requirePermission('org.delete'), controller.delete);

  // Team/members (need org context)
  router.get('/team/members', authMiddleware, orgResolver, requirePermission('team.view'), controller.listMembers);
  router.post('/team/invite', authMiddleware, orgResolver, requirePermission('team.invite'), controller.inviteMember);
  router.patch('/team/members/:userId/role', authMiddleware, orgResolver, requirePermission('team.role.change'), controller.changeMemberRole);
  router.delete('/team/members/:userId', authMiddleware, orgResolver, requirePermission('team.remove'), controller.removeMember);

  return router;
}
