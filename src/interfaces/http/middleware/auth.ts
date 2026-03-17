import { Context, Next } from 'koa';
import { SupabaseClientFactory } from '../../../infrastructure/database/supabase';
import { UnauthorizedError } from '../../../domain/errors/app-error';
import * as EC from '../../../domain/enums/error-codes';

export function createAuthMiddleware(supabase: SupabaseClientFactory) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header', EC.AUTH401002);
    }

    const token = authHeader.substring(7);
    const client = supabase.createClient(token);
    const { data: { user }, error } = await client.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token', EC.AUTH401003);
    }

    ctx.state.user = user;
    ctx.state.accessToken = token;
    await next();
  };
}
