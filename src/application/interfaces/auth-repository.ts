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

export interface IAuthRepository {
  signup(input: SignupInput): Promise<SignupOutput>;
  login(input: LoginInput): Promise<LoginOutput>;
  logout(accessToken: string): Promise<void>;
  refresh(input: RefreshInput): Promise<RefreshOutput>;
  getMe(accessToken: string): Promise<MeOutput>;
  getGoogleOAuthUrl(redirectTo: string): Promise<OAuthUrlOutput>;
  getFacebookOAuthUrl(redirectTo: string): Promise<OAuthUrlOutput>;
  exchangeOAuthCode(input: OAuthCallbackInput): Promise<OAuthCallbackOutput>;
  updateProfile(accessToken: string, input: UpdateProfileInput): Promise<UpdateProfileOutput>;
}
