import Koa from 'koa';
import cors from '@koa/cors';
import { bodyParser } from '@koa/bodyparser';
import { env } from './config/env';
import { errorHandler } from './interfaces/http/middleware/error-handler';
import { requestLogger } from './interfaces/http/middleware/request-logger';
import { responseTransformer } from './interfaces/http/middleware/response-transformer';
import { createAuthMiddleware } from './interfaces/http/middleware/auth';
import { createAuthRouter } from './interfaces/http/routes/auth.routes';
import { AuthController } from './interfaces/http/controllers/auth.controller';
import { SupabaseClientFactory } from './infrastructure/database/supabase';
import { SupabaseAuthRepository } from './infrastructure/repositories/supabase-auth-repository';
import { SignupUseCase } from './application/use-cases/auth/signup';
import { LoginUseCase } from './application/use-cases/auth/login';
import { LogoutUseCase } from './application/use-cases/auth/logout';
import { RefreshUseCase } from './application/use-cases/auth/refresh';
import { GetMeUseCase } from './application/use-cases/auth/get-me';
import { GoogleOAuthUseCase } from './application/use-cases/auth/google-oauth';
import { OAuthCallbackUseCase } from './application/use-cases/auth/oauth-callback';
import { UpdateProfileUseCase } from './application/use-cases/auth/update-profile';
import { logger } from './infrastructure/logger';

const app = new Koa();

// --- Dependency Injection ---
const supabaseFactory = new SupabaseClientFactory();
const authMiddleware = createAuthMiddleware(supabaseFactory);

const authRepo = new SupabaseAuthRepository(supabaseFactory);
const authController = new AuthController(
  new SignupUseCase(authRepo),
  new LoginUseCase(authRepo),
  new LogoutUseCase(authRepo),
  new RefreshUseCase(authRepo),
  new GetMeUseCase(authRepo),
  new GoogleOAuthUseCase(authRepo),
  new OAuthCallbackUseCase(authRepo),
  new UpdateProfileUseCase(authRepo),
);

// --- Health Check ---
app.use(async (ctx, next) => {
  if (ctx.path === '/health' && ctx.method === 'GET') {
    ctx.status = 200;
    ctx.body = { status: 'ok' };
    return;
  }
  await next();
});

// --- Middleware ---
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(errorHandler);
app.use(requestLogger);
app.use(responseTransformer);
app.use(bodyParser());

// --- Routes ---
const authRouter = createAuthRouter(authController, authMiddleware);
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// --- Start ---
app.listen(env.port, () => {
  logger.info(`SyncHub API running on http://localhost:${env.port}`);
});

export default app;
