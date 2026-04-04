import { randomBytes, createHash } from "crypto";
import axios from "axios";
import { env } from "@/config/env";
import { AppError } from "@/domain/errors/app-error";
import * as EC from "@/domain/enums/error-codes";
import { logger } from "@/infrastructure/logger";

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_ME_URL = "https://api.twitter.com/2/users/me";

export interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface XUserInfo {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface XUserInfoResponse {
  data: XUserInfo;
}

export class XApiClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = env.x.clientId;
    this.clientSecret = env.x.clientSecret;
    this.redirectUri = env.x.redirectUri;
  }

  /**
   * Generate X (Twitter) OAuth 2.0 Auth URL with PKCE.
   */
  generateAuthUrl(state: string, codeChallenge: string, scopes?: string[]): string {
    const scope = scopes?.length
      ? scopes.join(" ")
      : "tweet.read tweet.write users.read follows.read offline.access";

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "consent",
    });

    return `${X_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<XTokenResponse> {
    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      
      const params = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      });

      const { data } = await axios.post<XTokenResponse>(X_TOKEN_URL, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      });

      return data;
    } catch (error: any) {
      logger.error("X token exchange failed", { 
        error: error.response?.data || error.message 
      });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to exchange X authorization code",
        400
      );
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<XTokenResponse> {
    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        client_id: this.clientId,
      });

      const { data } = await axios.post<XTokenResponse>(X_TOKEN_URL, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      });

      return data;
    } catch (error: any) {
      logger.error("X token refresh failed", { 
        error: error.response?.data || error.message 
      });
      throw new AppError(
        EC.SOCIAL400004,
        "Failed to refresh X access token",
        400
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<XUserInfo> {
    try {
      const { data } = await axios.get<XUserInfoResponse>(X_ME_URL, {
        params: {
          "user.fields": "profile_image_url,verified",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return data.data;
    } catch (error: any) {
      logger.error("X user info fetch failed", { 
        error: error.response?.data || error.message 
      });
      throw new AppError(
        EC.SOCIAL400003,
        "Failed to fetch X user info",
        400
      );
    }
  }

  generateState(): string {
    return randomBytes(16).toString("hex");
  }

  generatePKCE(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return { verifier, challenge };
  }
}
