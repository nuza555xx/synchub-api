import { IAuthRepository } from '@/application/interfaces/auth-repository';
import {
  SignupInput,
  SignupOutput,
  LoginInput,
  LoginOutput,
  RefreshInput,
  RefreshOutput,
  MeOutput,
  OAuthUrlOutput,
  OAuthCallbackInput,
  OAuthCallbackOutput,
  UpdateProfileInput,
  UpdateProfileOutput,
} from '@/application/dto/auth.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { AppError, UnauthorizedError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly supabase: SupabaseClientFactory) {}

  async signup(input: SignupInput): Promise<SignupOutput> {
    const client = this.supabase.createClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new AppError(EC.AUTH400002, error.message, 400);
    }

    if (!data.user) {
      throw new AppError(EC.AUTH400002, 'Signup failed', 400);
    }

    return {
      id: data.user.id,
      email: data.user.email!,
    };
  }

  async login(input: LoginInput): Promise<LoginOutput> {
    const client = this.supabase.createClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new UnauthorizedError(error.message, EC.AUTH401001);
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedError('Login failed', EC.AUTH401001);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: (data.user.user_metadata?.role as string) || 'viewer',
      },
    };
  }

  async logout(accessToken: string): Promise<void> {
    const client = this.supabase.createClient(accessToken);
    const { error } = await client.auth.signOut();

    if (error) {
      throw new AppError(EC.AUTH400003, error.message, 400);
    }
  }

  async refresh(input: RefreshInput): Promise<RefreshOutput> {
    const client = this.supabase.createClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: input.refreshToken,
    });

    if (error) {
      throw new UnauthorizedError(error.message, EC.AUTH401004);
    }

    if (!data.session) {
      throw new UnauthorizedError('Refresh failed', EC.AUTH401004);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async getMe(accessToken: string): Promise<MeOutput> {
    const client = this.supabase.createClient(accessToken);
    const { data: { user }, error } = await client.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedError('Invalid token', EC.AUTH401003);
    }

    return {
      id: user.id,
      email: user.email!,
      fullName: (user.user_metadata?.full_name as string) || null,
      avatarUrl: (user.user_metadata?.avatar_url as string) || null,
      role: (user.user_metadata?.role as string) || 'viewer',
      createdAt: user.created_at,
    };
  }

  async getGoogleOAuthUrl(redirectTo: string): Promise<OAuthUrlOutput> {
    const client = this.supabase.createClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error || !data.url) {
      throw new AppError(EC.AUTH400002, error?.message || 'Failed to generate Google OAuth URL', 400);
    }

    return { url: data.url };
  }

  async exchangeOAuthCode(input: OAuthCallbackInput): Promise<OAuthCallbackOutput> {
    const client = this.supabase.createClient();
    const { data, error } = await client.auth.exchangeCodeForSession(input.code);

    if (error || !data.session || !data.user) {
      throw new UnauthorizedError(error?.message || 'OAuth callback failed', EC.AUTH401001);
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: (data.user.user_metadata?.role as string) || 'viewer',
      },
    };
  }

  async updateProfile(accessToken: string, input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const client = this.supabase.createClient(accessToken);
    const { data: { user }, error } = await client.auth.updateUser({
      data: {
        ...(input.fullName !== undefined && { full_name: input.fullName }),
        ...(input.avatarUrl !== undefined && { avatar_url: input.avatarUrl }),
      },
    });

    if (error || !user) {
      throw new AppError(EC.AUTH400004, error?.message || 'Update profile failed', 400);
    }

    return {
      id: user.id,
      email: user.email!,
      fullName: (user.user_metadata?.full_name as string) || null,
      avatarUrl: (user.user_metadata?.avatar_url as string) || null,
      role: (user.user_metadata?.role as string) || 'viewer',
      createdAt: user.created_at,
    };
  }
}
