import { randomBytes } from "crypto";
import axios from "axios";
import { env } from "@/config/env";
import { AppError } from "@/domain/errors/app-error";
import * as EC from "@/domain/enums/error-codes";
import { logger } from "@/infrastructure/logger";

const FB_AUTH_URL = "https://www.facebook.com/v25.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v25.0/oauth/access_token";
const FB_ME_URL = "https://graph.facebook.com/v25.0/me";

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export class FacebookApiClient {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.appId = env.facebook.appId;
    this.appSecret = env.facebook.appSecret;
    this.redirectUri = env.facebook.redirectUri;
  }

  generateAuthUrl(state: string, scopes?: string[]): string {
    const scope = scopes?.length
      ? scopes.join(",")
      : "public_profile,email,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish";
    
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      scope,
      response_type: "code",
    });
    
    return `${FB_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<FacebookTokenResponse> {
    try {
      const { data } = await axios.get<FacebookTokenResponse>(FB_TOKEN_URL, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code,
        },
      });

      return data;
    } catch (error) {
      logger.error("Facebook token exchange failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to exchange Facebook authorization code",
        400
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    try {
      const { data } = await axios.get<FacebookUserInfo>(FB_ME_URL, {
        params: {
          fields: "id,name,picture.type(large)",
          access_token: accessToken,
        },
      });

      return data;
    } catch (error) {
      logger.error("Facebook user info fetch failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to fetch Facebook user info",
        400
      );
    }
  }

  generateState(): string {
    return randomBytes(16).toString("hex");
  }
}
