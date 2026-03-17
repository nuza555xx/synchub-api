import { randomUUID } from 'crypto';
import { Context, Next } from 'koa';
import { logger } from '../../../infrastructure/logger';

export async function requestLogger(ctx: Context, next: Next): Promise<void> {
  const requestId = (ctx.get('X-Request-ID') as string) || randomUUID();
  ctx.state.requestId = requestId;
  ctx.set('X-Request-ID', requestId);

  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  logger.info(`${ctx.method} ${ctx.path} ${ctx.status} ${ms}ms`, {
    requestId,
    method: ctx.method,
    path: ctx.path,
    status: ctx.status,
    ms,
  });
}
