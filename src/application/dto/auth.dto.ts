export interface SignupInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupOutput {
  id: string;
  email: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface RefreshOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MeOutput {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface OAuthUrlOutput {
  url: string;
}

export interface OAuthCallbackInput {
  code: string;
}

export type OAuthCallbackOutput = LoginOutput;

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
}

export type UpdateProfileOutput = MeOutput;
