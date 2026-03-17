import { Context, Next } from 'koa';

export async function responseTransformer(ctx: Context, next: Next): Promise<void> {
  await next();

  // Skip if body was already set by error-handler or is not a JSON object
  if (!ctx.body || typeof ctx.body !== 'object' || !('code' in (ctx.body as Record<string, unknown>))) {
    return;
  }

  const body = ctx.body as Record<string, unknown>;

  ctx.body = {
    requestId: ctx.state.requestId,
    status: ctx.status,
    code: body.code,
    message: body.message,
    result: body.result ?? null,
  };
}
