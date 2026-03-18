import 'koa';
import type { Context } from 'koa';

declare module 'koa' {
  interface Request {
    body?: any;
  }
}

export interface AuthState {
  user: { id: string };
  accessToken: string;
}

export type TypedContext<
  B = unknown,
  P extends Record<string, string> = Record<string, string>,
  Q extends Record<string, string | undefined> = Record<string, string | undefined>,
> = Context & { request: { body: B }; params: P; query: Q; state: AuthState };
