import type { ListSocialAccountsCtx, GetHealthCtx, ConnectCtx, SocialCallbackCtx, RefreshTokenCtx, DisconnectCtx } from './types';
import { getUserId } from '@/types/context';
import { ListSocialAccountsUseCase } from '@/application/use-cases/social-accounts/list-social-accounts';
import { GetSocialAccountHealthUseCase } from '@/application/use-cases/social-accounts/get-social-account-health';
import { ConnectSocialAccountUseCase } from '@/application/use-cases/social-accounts/connect-social-account';
import { SocialCallbackUseCase } from '@/application/use-cases/social-accounts/social-callback';
import { RefreshSocialTokenUseCase } from '@/application/use-cases/social-accounts/refresh-social-token';
import { DisconnectSocialAccountUseCase } from '@/application/use-cases/social-accounts/disconnect-social-account';
import {
  connectPlatformSchema,
  socialCallbackSchema,
  socialAccountIdSchema,
} from '@/interfaces/http/validators/social-account.validator';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { SocialPlatform } from '@/domain/entities/social-account';
import { env } from '@/config/env';

export class SocialAccountController {
  constructor(
    private readonly listUseCase: ListSocialAccountsUseCase,
    private readonly healthUseCase: GetSocialAccountHealthUseCase,
    private readonly connectUseCase: ConnectSocialAccountUseCase,
    private readonly callbackUseCase: SocialCallbackUseCase,
    private readonly refreshTokenUseCase: RefreshSocialTokenUseCase,
    private readonly disconnectUseCase: DisconnectSocialAccountUseCase,
  ) {}

  list = async (ctx: ListSocialAccountsCtx): Promise<void> => {
    const userId = getUserId(ctx);
    const result = await this.listUseCase.execute(userId);
    ctx.status = 200;
    ctx.body = {
      code: 'SOCIAL200001',
      message: 'Social accounts retrieved',
      result,
    };
  };

  getHealth = async (ctx: GetHealthCtx): Promise<void> => {
    const parsed = socialAccountIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const userId = getUserId(ctx);
    const result = await this.healthUseCase.execute(parsed.data.id, userId);
    ctx.status = 200;
    ctx.body = {
      code: 'SOCIAL200002',
      message: 'Token health retrieved',
      result,
    };
  };

  connect = async (ctx: ConnectCtx): Promise<void> => {
    const parsed = connectPlatformSchema.safeParse({ platform: ctx.params.platform });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const userId = getUserId(ctx);
    const scopes = Array.isArray(ctx.request.body.scopes) ? ctx.request.body.scopes.filter((s: unknown): s is string => typeof s === 'string') : [];
    const result = await this.connectUseCase.execute({
      userId,
      platform: parsed.data.platform,
      redirectUri: '',
      scopes,
    });
    ctx.status = 200;
    ctx.body = {
      code: 'SOCIAL200003',
      message: 'OAuth URL generated',
      result,
    };
  };

  callback = async (ctx: SocialCallbackCtx): Promise<void> => {
    const platformParsed = connectPlatformSchema.safeParse({ platform: ctx.params.platform });
    if (!platformParsed.success) {
      throw new ValidationError(platformParsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const parsed = socialCallbackSchema.safeParse(ctx.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const redirectBase = `${env.frontendUrl}/social-accounts/callback`;

    try {
      const result = await this.callbackUseCase.execute({
        platform: platformParsed.data.platform as SocialPlatform,
        code: parsed.data.code,
        state: parsed.data.state!,
      });

      const params = new URLSearchParams({
        status: 'success',
        platform: result.platform,
        accountName: result.accountName,
      });
      ctx.redirect(`${redirectBase}?${params.toString()}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      const params = new URLSearchParams({
        status: 'error',
        platform: platformParsed.data.platform,
        error: message,
      });
      ctx.redirect(`${redirectBase}?${params.toString()}`);
    }
  };

  refreshToken = async (ctx: RefreshTokenCtx): Promise<void> => {
    const parsed = socialAccountIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const userId = getUserId(ctx);
    const result = await this.refreshTokenUseCase.execute({
      socialAccountId: parsed.data.id,
      userId,
    });
    ctx.status = 200;
    ctx.body = {
      code: 'SOCIAL200005',
      message: 'Token refreshed',
      result,
    };
  };

  disconnect = async (ctx: DisconnectCtx): Promise<void> => {
    const parsed = socialAccountIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.SOCIAL400001);
    }

    const userId = getUserId(ctx);
    await this.disconnectUseCase.execute({
      socialAccountId: parsed.data.id,
      userId,
    });
    ctx.status = 200;
    ctx.body = {
      code: 'SOCIAL200006',
      message: 'Social account disconnected',
      result: null,
    };
  };
}
