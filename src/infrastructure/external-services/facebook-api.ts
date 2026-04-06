import { randomBytes } from "crypto";
import axios from "axios";
import { env } from "@/config/env";
import { AppError } from "@/domain/errors/app-error";
import * as EC from "@/domain/enums/error-codes";
import { logger } from "@/infrastructure/logger";

const FB_GRAPH_VERSION = "v25.0";
const FB_AUTH_URL = `https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth`;
const FB_TOKEN_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token`;
const FB_ME_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}/me`;
const FB_ACCOUNTS_URL = `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts`;

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookUserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks?: string[];
}

export interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
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

  /**
   * Generate Standard Facebook Page management OAuth URL.
   */
  generateAuthUrl(state: string, scopes?: string[]): string {
    const scope = scopes?.length
      ? scopes.join(",")
      : "public_profile,email,pages_read_engagement,pages_manage_posts";

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

  /**
   * Exchange a short-lived token for a long-lived token (~60 days).
   * Required for maintain Page access without frequent re-login.
   */
  async getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
    try {
      const { data } = await axios.get<FacebookTokenResponse>(FB_TOKEN_URL, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      return data;
    } catch (error) {
      logger.error("Facebook long-lived token exchange failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to exchange for long-lived token",
        400
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    try {
      const { data } = await axios.get<FacebookUserInfo>(FB_ME_URL, {
        params: {
          fields: "id,name,email,picture.type(large)",
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

  /**
   * Get the Facebook Pages the user has access to.
   */
  async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    try {
      const { data } = await axios.get<FacebookPagesResponse>(FB_ACCOUNTS_URL, {
        params: {
          fields: "id,name,access_token,category,tasks",
          access_token: accessToken,
        },
      });

      return data.data || [];
    } catch (error) {
      logger.error("Facebook pages fetch failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to fetch Facebook pages",
        400
      );
    }
  }

  /**
   * Debug a token to check its validity, scopes, and expiration.
   */
  async debugToken(accessToken: string): Promise<{
    is_valid: boolean;
    scopes: string[];
    expires_at: number;
    type: string;
    app_id: string;
  }> {
    try {
      const { data } = await axios.get(
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/debug_token`,
        {
          params: {
            input_token: accessToken,
            access_token: `${this.appId}|${this.appSecret}`,
          },
        }
      );

      return data.data;
    } catch (error) {
      logger.error("Facebook token debug failed", { error });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to debug Facebook token",
        400
      );
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.delete(
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/permissions`,
        { params: { access_token: accessToken } },
      );
      logger.info("Facebook token revoked successfully");
    } catch (error) {
      logger.warn("Facebook token revocation failed (non-blocking)", { error });
    }
  }

  generateState(): string {
    return randomBytes(16).toString("hex");
  }
}
