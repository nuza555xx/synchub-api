import { randomBytes } from "crypto";
import axios from "axios";
import { env } from "@/config/env";
import { AppError } from "@/domain/errors/app-error";
import * as EC from "@/domain/enums/error-codes";
import { logger } from "@/infrastructure/logger";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_PUBLISH_VIDEO_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_PUBLISH_STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
const TIKTOK_PUBLISH_PHOTO_URL =
  "https://open.tiktokapis.com/v2/post/publish/content/init/";
const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";

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
}

export interface TikTokUserInfoResponse {
  data: { user: TikTokUserInfo };
  error: { code: string; message: string; log_id: string };
}

// --- TikTok Content Posting API ---

export interface TikTokPostResponse {
  data: {
    publish_id: string;
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export interface TikTokPublishStatusResponse {
  data: {
    status:
      | "PROCESSING_UPLOAD"
      | "PROCESSING_DOWNLOAD"
      | "SEND_TO_USER_INBOX"
      | "PUBLISH_COMPLETE"
      | "FAILED";
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    uploaded_bytes?: number;
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";
export type TikTokMediaType = "VIDEO" | "PHOTO";

export interface TikTokDirectPostOptions {
  mediaType: TikTokMediaType;
  /** Post caption / title (max 2200 chars) */
  title: string;
  /** Video URL (required when mediaType is VIDEO) */
  videoUrl?: string;
  /** Photo URLs (required when mediaType is PHOTO, max 35 images) */
  photoUrls?: string[];
  privacyLevel?: TikTokPrivacyLevel;
  autoAddMusic?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
  photoCoverIndex?: number;
}

// --- TikTok API Request Body Interfaces ---

interface TikTokPostInfoBase {
  privacy_level: TikTokPrivacyLevel | string;
  disable_comment: boolean;
  brand_content_toggle: boolean;
  brand_organic_toggle: boolean;
}

interface TikTokVideoPostInfo extends TikTokPostInfoBase {
  title: string;
}

interface TikTokPhotoPostInfo extends TikTokPostInfoBase {
  description: string;
}

interface TikTokVideoSourceInfo {
  source: "PULL_FROM_URL";
  video_url: string;
}

interface TikTokPhotoSourceInfo {
  source: "PULL_FROM_URL";
  photo_cover_index: number;
  photo_images: string[];
}

interface TikTokVideoRequestBody {
  post_info: TikTokVideoPostInfo;
  source_info: TikTokVideoSourceInfo;
}

interface TikTokPhotoRequestBody {
  post_info: TikTokPhotoPostInfo;
  source_info: TikTokPhotoSourceInfo;
  media_type: "PHOTO";
  post_mode: "DIRECT_POST";
  auto_add_music: boolean;
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

  generateAuthUrl(state: string, scopes?: string[]): string {
    const scope = scopes?.length
      ? scopes.join(",")
      : "user.info.basic,user.info.profile";
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: "code",
      scope,
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

    try {
      const { data } = await axios.post<
        TikTokTokenResponse & Partial<TikTokTokenErrorResponse>
      >(TIKTOK_TOKEN_URL, body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

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
              "open_id,display_name,avatar_url,avatar_url_100,is_verified,username",
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

  async publishVideo(
    accessToken: string,
    options: {
      title: string;
      videoUrl: string;
      privacyLevel?: string;
      brandContentToggle?: boolean;
      brandOrganicToggle?: boolean;
    },
  ): Promise<{ publishId: string }> {
    logger.info("TikTok publishVideo called", {
      videoUrl: options.videoUrl,
      privacyLevel: options.privacyLevel || "SELF_ONLY",
      titleLength: options.title.length,
    });
    return this.directPost(accessToken, {
      mediaType: "VIDEO",
      title: options.title,
      videoUrl: options.videoUrl,
      privacyLevel: (options.privacyLevel as TikTokPrivacyLevel) || "SELF_ONLY",
      brandContentToggle: options.brandContentToggle,
      brandOrganicToggle: options.brandOrganicToggle,
    });
  }

  async publishPhoto(
    accessToken: string,
    options: {
      title: string;
      photoUrls: string[];
      privacyLevel?: string;
      autoAddMusic?: boolean;
      brandContentToggle?: boolean;
      brandOrganicToggle?: boolean;
    },
  ): Promise<{ publishId: string }> {
    logger.info("TikTok publishPhoto called", {
      photoCount: options.photoUrls.length,
      privacyLevel: options.privacyLevel || "SELF_ONLY",
      titleLength: options.title.length,
    });
    return this.directPost(accessToken, {
      mediaType: "PHOTO",
      title: options.title,
      photoUrls: options.photoUrls,
      privacyLevel: (options.privacyLevel as TikTokPrivacyLevel) || "SELF_ONLY",
      autoAddMusic: options.autoAddMusic,
      brandContentToggle: options.brandContentToggle,
      brandOrganicToggle: options.brandOrganicToggle,
    });
  }

  /**
   * Unified direct post to TikTok.
   * Supports both VIDEO and PHOTO media types using PULL_FROM_URL source.
   */
  async directPost(
    accessToken: string,
    options: TikTokDirectPostOptions,
  ): Promise<{ publishId: string }> {
    const isVideo = options.mediaType === "VIDEO";
    const url = isVideo ? TIKTOK_PUBLISH_VIDEO_URL : TIKTOK_PUBLISH_PHOTO_URL;

    let body: TikTokVideoRequestBody | TikTokPhotoRequestBody;

    if (isVideo) {
      if (!options.videoUrl) {
        throw new AppError(
          EC.POST400003,
          "videoUrl is required for VIDEO media type",
          400,
        );
      }
      body = {
        post_info: {
          title: options.title.slice(0, 2200),
          privacy_level: options.privacyLevel || "SELF_ONLY",
          disable_comment: false,
          brand_content_toggle: options.brandContentToggle ?? false,
          brand_organic_toggle: options.brandOrganicToggle ?? false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: options.videoUrl,
        },
      };
    } else {
      if (!options.photoUrls || options.photoUrls.length === 0) {
        throw new AppError(
          EC.POST400003,
          "photoUrls is required for PHOTO media type",
          400,
        );
      }
      body = {
        post_info: {
          title: options.title.slice(0, 90),
          description: options.title.slice(0, 2200),
          privacy_level: options.privacyLevel || "SELF_ONLY",
          disable_comment: false,
          brand_content_toggle: options.brandContentToggle ?? false,
          brand_organic_toggle: options.brandOrganicToggle ?? false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_cover_index: options.photoCoverIndex ?? 0,
          photo_images: options.photoUrls,
        },
        media_type: "PHOTO",
        post_mode: "DIRECT_POST",
        auto_add_music: options.autoAddMusic ?? true,
      };
    }

    logger.info("TikTok directPost request", {
      url,
      mediaType: options.mediaType,
      body,
    });

    try {
      const { data } = await axios.post<TikTokPostResponse>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      });

      logger.info("TikTok directPost response", {
        fullResponse: data,
      });

      if (data.error.code !== "ok") {
        logger.error("TikTok direct post failed", {
          code: data.error.code,
          message: data.error.message,
          logId: data.error.log_id,
        });
        throw new AppError(
          EC.POST400002,
          data.error.message || "TikTok publish failed",
          400,
        );
      }

      logger.info("TikTok directPost success", {
        publishId: data.data.publish_id,
      });
      return { publishId: data.data.publish_id };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errData = axios.isAxiosError(error)
        ? (error.response?.data as TikTokPostResponse)
        : undefined;
      logger.error("TikTok direct post failed", {
        error: errData ?? error,
        logId: errData?.error?.log_id,
      });
      throw new AppError(
        EC.POST400002,
        errData?.error?.message ||
          `Failed to publish ${options.mediaType.toLowerCase()} to TikTok`,
        400,
      );
    }
  }

  async getPublishStatus(
    accessToken: string,
    publishId: string,
  ): Promise<TikTokPublishStatusResponse["data"]> {
    logger.info("TikTok getPublishStatus called", { publishId });
    try {
      const { data } = await axios.post<TikTokPublishStatusResponse>(
        TIKTOK_PUBLISH_STATUS_URL,
        { publish_id: publishId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        },
      );

      logger.info("TikTok getPublishStatus response", { fullResponse: data });

      if (data.error.code !== "ok") {
        logger.error("TikTok publish status check failed", {
          code: data.error.code,
          message: data.error.message,
          logId: data.error.log_id,
        });
        throw new AppError(
          EC.POST400002,
          data.error.message || "Failed to get publish status",
          400,
        );
      }

      logger.info("TikTok publish status result", {
        publishId,
        status: data.data.status,
        failReason: data.data.fail_reason,
        postIds: data.data.publicaly_available_post_id,
      });

      return data.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const errData = axios.isAxiosError(error)
        ? error.response?.data
        : undefined;
      logger.error("TikTok publish status check failed", {
        error: errData ?? error,
      });
      throw new AppError(
        EC.POST400002,
        "Failed to check TikTok publish status",
        400,
      );
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.post(
        TIKTOK_REVOKE_URL,
        new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          token: accessToken,
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      logger.info("TikTok token revoked successfully");
    } catch (error) {
      const errData = axios.isAxiosError(error) ? error.response?.data : undefined;
      logger.warn("TikTok token revocation failed (non-blocking)", { error: errData ?? error });
    }
  }

  generateState(): string {
    return randomBytes(16).toString("hex");
  }
}
