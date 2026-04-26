import { Context, Next } from 'koa';
import { type Permission, hasPermission } from '@/domain/enums/permissions';
import { ForbiddenError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

/**
 * RBAC middleware: checks if user's org role has the required permission.
 * Must be used AFTER org-resolver middleware (which sets ctx.state.membership).
 */
export function requirePermission(permission: Permission) {
  return async (ctx: Context, next: Next): Promise<void> => {
    const role = ctx.state.membership?.role;
    if (!role || !hasPermission(role, permission)) {
      throw new ForbiddenError('Insufficient permissions', EC.AUTH403001);
    }
    await next();
  };
}
