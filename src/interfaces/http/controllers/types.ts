import type { TypedContext } from '@/types/koa';
import type { SocialPlatform } from '@/domain/entities/social-account';

// --- Auth Controller ---
export type SignupCtx = TypedContext<{ email: string; password: string; signature: string }>;
export type LoginCtx = TypedContext<{ email: string; password: string; signature: string }>;
export type RefreshCtx = TypedContext<{ refreshToken: string }>;
export type GoogleOAuthCtx = TypedContext<unknown, Record<string, string>, { redirectTo?: string }>;
export type OAuthCallbackCtx = TypedContext<{ code: string }>;
export type UpdateProfileCtx = TypedContext<{ fullName?: string; avatarUrl?: string }>;

// --- Social Account Controller ---
export type ListSocialAccountsCtx = TypedContext;
export type GetHealthCtx = TypedContext<unknown, { id: string }>;
export type ConnectCtx = TypedContext<{ scopes?: string[] }, { platform: SocialPlatform }>;
export type SocialCallbackCtx = TypedContext<unknown, { platform: SocialPlatform }, { code: string; state: string }>;
export type RefreshTokenCtx = TypedContext<unknown, { id: string }>;
export type DisconnectCtx = TypedContext<unknown, { id: string }>;

// --- Activity Log Controller ---
export type ListActivityLogsCtx = TypedContext<unknown, Record<string, string>, { page?: string; limit?: string; action?: string }>;

// --- Draft Post Controller ---
export type CreateDraftCtx = TypedContext<{ content?: string; mediaType: string; socialAccountIds?: string[] }>;
export type UpdateDraftCtx = TypedContext<{ content?: string; socialAccountIds?: string[] }, { id: string }>;
export type GetDraftCtx = TypedContext<unknown, { id: string }>;
export type ListDraftsCtx = TypedContext;
export type DeleteDraftCtx = TypedContext<unknown, { id: string }>;
export type UploadDraftMediaCtx = TypedContext<unknown, { id: string }>;
export type DeleteDraftMediaCtx = TypedContext<{ mediaUrl: string }, { id: string }>;
export type PublishPostCtx = TypedContext<{ privacyLevel?: string }, { id: string }>;
