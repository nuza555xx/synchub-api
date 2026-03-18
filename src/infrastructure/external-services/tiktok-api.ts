import { randomBytes } from "crypto";
import axios from "axios";
import { env } from "../../config/env";
import { AppError } from "../../domain/errors/app-error";
import * as EC from "../../domain/enums/error-codes";
import { logger } from "../logger";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface TikTokTokenErrorResponse {
  error: string;
  error_description: string;
  log_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url: string;
  avatar_url_100: string;
  is_verified: boolean;
  username: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export interface TikTokUserInfoResponse {
  data: { user: TikTokUserInfo };
  error: { code: string; message: string; log_id: string };
}

export class TikTokApiClient {
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientKey = env.tiktok.clientKey;
    this.clientSecret = env.tiktok.clientSecret;
    this.redirectUri = env.tiktok.redirectUri;
  }

  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: "code",
      scope: "user.info.basic,user.info.profile,user.info.stats",
      redirect_uri: this.redirectUri,
      state,
    });
    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri,
    });

    logger.info("TikTok token exchange request", {
      url: TIKTOK_TOKEN_URL,
      redirect_uri: this.redirectUri,
      code_length: code.length,
    });

    try {
      const { data } = await axios.post<
        TikTokTokenResponse & Partial<TikTokTokenErrorResponse>
      >(TIKTOK_TOKEN_URL, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      logger.info("TikTok token exchange response", { data });

      if (data.error) {
        throw new AppError(
          EC.SOCIAL400003,
          data.error_description ||
            "Failed to exchange TikTok authorization code",
          400,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errData = axios.isAxiosError(error)
        ? (error.response?.data as TikTokTokenErrorResponse)
        : undefined;
      logger.error("TikTok token exchange failed", { error: errData ?? error });
      throw new AppError(
        EC.SOCIAL400003,
        errData?.error_description ||
          "Failed to exchange TikTok authorization code",
        400,
      );
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    try {
      const { data } = await axios.post<
        TikTokTokenResponse & Partial<TikTokTokenErrorResponse>
      >(TIKTOK_TOKEN_URL, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (data.error) {
        throw new AppError(
          EC.SOCIAL400004,
          data.error_description || "Failed to refresh TikTok token",
          400,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errData = axios.isAxiosError(error)
        ? (error.response?.data as TikTokTokenErrorResponse)
        : undefined;
      logger.error("TikTok token refresh failed", { error: errData ?? error });
      throw new AppError(
        EC.SOCIAL400004,
        errData?.error_description || "Failed to refresh TikTok token",
        400,
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    try {
      const { data } = await axios.get<TikTokUserInfoResponse>(
        TIKTOK_USER_INFO_URL,
        {
          params: {
            fields:
              "open_id,display_name,avatar_url,avatar_url_100,is_verified,username,followers_count,following_count,likes_count,video_count",
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (data.error.code && data.error.code !== "ok") {
        throw new AppError(
          EC.SOCIAL400003,
          data.error.message || "Failed to fetch TikTok user info",
          400,
        );
      }

      const user = data.data.user;
      return {
        open_id: user.open_id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        avatar_url_100: user.avatar_url_100,
        is_verified: user.is_verified,
        username: user.username,
        followers_count: user.followers_count,
        following_count: user.following_count,
        likes_count: user.likes_count,
        video_count: user.video_count,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("TikTok user info fetch failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to fetch TikTok user info",
        400,
      );
    }
  }

  generateState(): string {
    return randomBytes(16).toString("hex");
  }
}
