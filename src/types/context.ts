import type { AuthState } from './koa';

export function getUserId(ctx: { state: AuthState }): string {
  return ctx.state.user.id;
}

export function getAccessToken(ctx: { state: AuthState }): string {
  return ctx.state.accessToken;
}
