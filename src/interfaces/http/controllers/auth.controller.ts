import { Context } from "koa";
import { SignupUseCase } from "../../../application/use-cases/auth/signup";
import { LoginUseCase } from "../../../application/use-cases/auth/login";
import { LogoutUseCase } from "../../../application/use-cases/auth/logout";
import { RefreshUseCase } from "../../../application/use-cases/auth/refresh";
import { GetMeUseCase } from "../../../application/use-cases/auth/get-me";
import { GoogleOAuthUseCase } from "../../../application/use-cases/auth/google-oauth";
import { OAuthCallbackUseCase } from "../../../application/use-cases/auth/oauth-callback";
import { UpdateProfileUseCase } from "../../../application/use-cases/auth/update-profile";
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  oauthCallbackSchema,
  updateProfileSchema,
} from "../validators/auth.validator";
import { ValidationError } from "../../../domain/errors/app-error";
import { AppError } from "../../../domain/errors/app-error";
import * as EC from "../../../domain/enums/error-codes";
import { verifyPasswordSignature } from "../../../infrastructure/encryption/verify-signature";

export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly googleOAuthUseCase: GoogleOAuthUseCase,
    private readonly oauthCallbackUseCase: OAuthCallbackUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  signup = async (ctx: Context): Promise<void> => {
    const parsed = signupSchema.safeParse((ctx.request as any).body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.AUTH400001);
    }

    if (!verifyPasswordSignature(parsed.data.password, parsed.data.signature)) {
      throw new AppError(EC.AUTH400005, 'Invalid password signature', 400);
    }

    const result = await this.signupUseCase.execute({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    ctx.status = 201;
    ctx.body = {
      code: "AUTH201001",
      message: "Signup successful",
      result,
    };
  };

  login = async (ctx: Context): Promise<void> => {
    const parsed = loginSchema.safeParse((ctx.request as any).body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.AUTH400001);
    }

    if (!verifyPasswordSignature(parsed.data.password, parsed.data.signature)) {
      throw new AppError(EC.AUTH400005, 'Invalid password signature', 400);
    }

    const result = await this.loginUseCase.execute({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200001",
      message: "Login successful",
      result,
    };
  };

  logout = async (ctx: Context): Promise<void> => {
    const token = ctx.state.accessToken as string;
    await this.logoutUseCase.execute(token);
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200002",
      message: "Logout successful",
      result: null,
    };
  };

  refresh = async (ctx: Context): Promise<void> => {
    const parsed = refreshSchema.safeParse((ctx.request as any).body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.AUTH400001);
    }

    const result = await this.refreshUseCase.execute({
      refreshToken: parsed.data.refreshToken,
    });
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200003",
      message: "Token refreshed",
      result,
    };
  };

  getMe = async (ctx: Context): Promise<void> => {
    const token = ctx.state.accessToken as string;
    const result = await this.getMeUseCase.execute(token);
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200004",
      message: "User profile retrieved",
      result,
    };
  };

  googleOAuth = async (ctx: Context): Promise<void> => {
    const redirectTo = (ctx.query.redirectTo as string) || `${ctx.origin}/api/v1/auth/callback`;
    const result = await this.googleOAuthUseCase.execute(redirectTo);
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200005",
      message: "Google OAuth URL generated",
      result,
    };
  };

  oauthCallback = async (ctx: Context): Promise<void> => {
    const parsed = oauthCallbackSchema.safeParse((ctx.request as any).body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.AUTH400001);
    }

    const result = await this.oauthCallbackUseCase.execute(parsed.data);
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200006",
      message: "OAuth login successful",
      result,
    };
  };

  updateProfile = async (ctx: Context): Promise<void> => {
    const parsed = updateProfileSchema.safeParse((ctx.request as any).body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.AUTH400001);
    }

    const token = ctx.state.accessToken as string;
    const result = await this.updateProfileUseCase.execute(token, parsed.data);
    ctx.status = 200;
    ctx.body = {
      code: "AUTH200007",
      message: "Profile updated",
      result,
    };
  };
}
