import Koa from 'koa';
import cors from '@koa/cors';
import { bodyParser } from '@koa/bodyparser';
import { env } from './config/env';
import { errorHandler } from './interfaces/http/middleware/error-handler';
import { requestLogger } from './interfaces/http/middleware/request-logger';
import { responseTransformer } from './interfaces/http/middleware/response-transformer';
import { createAuthMiddleware } from './interfaces/http/middleware/auth';
import { createAuthRouter } from './interfaces/http/routes/auth.routes';
import { createSocialAccountRouter } from './interfaces/http/routes/social-account.routes';
import { createActivityLogRouter } from './interfaces/http/routes/activity-log.routes';
import { createDraftPostRouter } from './interfaces/http/routes/post.routes';
import { AuthController } from './interfaces/http/controllers/auth.controller';
import { SocialAccountController } from './interfaces/http/controllers/social-account.controller';
import { ActivityLogController } from './interfaces/http/controllers/activity-log.controller';
import { DraftPostController } from './interfaces/http/controllers/post.controller';
import { SupabaseClientFactory } from './infrastructure/database/supabase';
import { SupabaseAuthRepository } from './infrastructure/repositories/supabase-auth-repository';
import { SignupUseCase } from './application/use-cases/auth/signup';
import { LoginUseCase } from './application/use-cases/auth/login';
import { LogoutUseCase } from './application/use-cases/auth/logout';
import { RefreshUseCase } from './application/use-cases/auth/refresh';
import { GetMeUseCase } from './application/use-cases/auth/get-me';
import { GoogleOAuthUseCase } from './application/use-cases/auth/google-oauth';
import { FacebookOAuthUseCase } from './application/use-cases/auth/facebook-oauth';
import { OAuthCallbackUseCase } from './application/use-cases/auth/oauth-callback';
import { UpdateProfileUseCase } from './application/use-cases/auth/update-profile';
import { ListSocialAccountsUseCase } from './application/use-cases/social-accounts/list-social-accounts';
import { GetSocialAccountHealthUseCase } from './application/use-cases/social-accounts/get-social-account-health';
import { ConnectSocialAccountUseCase } from './application/use-cases/social-accounts/connect-social-account';
import { SocialCallbackUseCase } from './application/use-cases/social-accounts/social-callback';
import { HandleOAuthErrorUseCase } from './application/use-cases/social-accounts/handle-oauth-error';
import { RefreshSocialTokenUseCase } from './application/use-cases/social-accounts/refresh-social-token';
import { DisconnectSocialAccountUseCase } from './application/use-cases/social-accounts/disconnect-social-account';
import { ListActivityLogsUseCase } from './application/use-cases/activity-logs/list-activity-logs';
import { CreateDraftPostUseCase } from './application/use-cases/posts/create-post';
import { UpdateDraftPostUseCase } from './application/use-cases/posts/update-post';
import { GetDraftPostUseCase } from './application/use-cases/posts/get-post';
import { ListDraftPostsUseCase } from './application/use-cases/posts/list-posts';
import { DeleteDraftPostUseCase } from './application/use-cases/posts/delete-post';
import { UploadDraftMediaUseCase } from './application/use-cases/posts/upload-media';
import { DeleteDraftMediaUseCase } from './application/use-cases/posts/delete-media';
import { SupabaseSocialAccountRepository } from './infrastructure/repositories/supabase-social-account-repository';
import { SupabaseActivityLogRepository } from './infrastructure/repositories/supabase-activity-log-repository';
import { SupabaseDraftPostRepository } from './infrastructure/repositories/supabase-post-repository';
import { TikTokApiClient } from './infrastructure/external-services/tiktok-api';
import { FacebookApiClient } from './infrastructure/external-services/facebook-api';
import { XApiClient } from './infrastructure/external-services/x-api';
import { logger } from './infrastructure/logger';
import { PublishPostUseCase } from './application/use-cases/posts/publish-post';

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
  new FacebookOAuthUseCase(authRepo),
  new OAuthCallbackUseCase(authRepo),
  new UpdateProfileUseCase(authRepo),
);

const tiktokApi = new TikTokApiClient();
const facebookApi = new FacebookApiClient();
const xApi = new XApiClient();
const activityLogRepo = new SupabaseActivityLogRepository(supabaseFactory);
const socialAccountRepo = new SupabaseSocialAccountRepository(supabaseFactory, tiktokApi, facebookApi, xApi, activityLogRepo);
const socialAccountController = new SocialAccountController(
  new ListSocialAccountsUseCase(socialAccountRepo),
  new GetSocialAccountHealthUseCase(socialAccountRepo),
  new ConnectSocialAccountUseCase(socialAccountRepo),
  new SocialCallbackUseCase(socialAccountRepo),
  new HandleOAuthErrorUseCase(socialAccountRepo),
  new RefreshSocialTokenUseCase(socialAccountRepo),
  new DisconnectSocialAccountUseCase(socialAccountRepo),
);

const activityLogController = new ActivityLogController(
  new ListActivityLogsUseCase(activityLogRepo),
);

const draftPostRepo = new SupabaseDraftPostRepository(supabaseFactory, tiktokApi);
const draftPostController = new DraftPostController(
  new CreateDraftPostUseCase(draftPostRepo),
  new UpdateDraftPostUseCase(draftPostRepo),
  new GetDraftPostUseCase(draftPostRepo),
  new ListDraftPostsUseCase(draftPostRepo),
  new DeleteDraftPostUseCase(draftPostRepo),
  new UploadDraftMediaUseCase(draftPostRepo),
  new DeleteDraftMediaUseCase(draftPostRepo),
  new PublishPostUseCase(draftPostRepo),
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
  origin: (ctx) => {
    const requestOrigin = ctx.get('Origin');
    return env.corsOrigins.includes(requestOrigin) ? requestOrigin : '';
  },
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

const socialAccountRouter = createSocialAccountRouter(socialAccountController, authMiddleware);
app.use(socialAccountRouter.routes());
app.use(socialAccountRouter.allowedMethods());

const activityLogRouter = createActivityLogRouter(activityLogController, authMiddleware);
app.use(activityLogRouter.routes());
app.use(activityLogRouter.allowedMethods());

const draftPostRouter = createDraftPostRouter(draftPostController, authMiddleware);
app.use(draftPostRouter.routes());
app.use(draftPostRouter.allowedMethods());

// --- Start ---
app.listen(env.port, () => {
  logger.info(`syncHub API running on http://localhost:${env.port}`);
});

export default app;
