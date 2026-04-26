import Router from '@koa/router';
import multer from '@koa/multer';
import { DraftPostController } from '@/interfaces/http/controllers/post.controller';
import { Middleware } from 'koa';
import { requirePermission } from '@/interfaces/http/middleware/rbac';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function createDraftPostRouter(
  controller: DraftPostController,
  authMiddleware: Middleware,
  orgResolver: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/posts' });

  router.post('/', authMiddleware, orgResolver, requirePermission('post.create'), controller.create);
  router.get('/', authMiddleware, orgResolver, requirePermission('post.view'), controller.list);
  router.get('/:id', authMiddleware, orgResolver, requirePermission('post.view'), controller.get);
  router.patch('/:id', authMiddleware, orgResolver, requirePermission('post.update'), controller.update);
  router.delete('/:id', authMiddleware, orgResolver, requirePermission('post.delete'), controller.delete);
  router.post('/:id/media', authMiddleware, orgResolver, requirePermission('media.upload'), upload.single('file'), controller.uploadMedia);
  router.delete('/:id/media', authMiddleware, orgResolver, requirePermission('media.delete'), controller.deleteMedia);
  router.post('/:id/publish', authMiddleware, orgResolver, requirePermission('post.publish'), controller.publish);

  return router;
}
