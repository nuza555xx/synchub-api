import Router from '@koa/router';
import multer from '@koa/multer';
import { DraftPostController } from '@/interfaces/http/controllers/post.controller';
import { Middleware } from 'koa';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function createDraftPostRouter(
  controller: DraftPostController,
  authMiddleware: Middleware,
): Router {
  const router = new Router({ prefix: '/api/v1/posts' });

  router.post('/', authMiddleware, controller.create);
  router.get('/', authMiddleware, controller.list);
  router.get('/:id', authMiddleware, controller.get);
  router.patch('/:id', authMiddleware, controller.update);
  router.delete('/:id', authMiddleware, controller.delete);
  router.post('/:id/media', authMiddleware, upload.single('file'), controller.uploadMedia);
  router.delete('/:id/media', authMiddleware, controller.deleteMedia);
  router.post('/:id/publish', authMiddleware, controller.publish);

  return router;
}
