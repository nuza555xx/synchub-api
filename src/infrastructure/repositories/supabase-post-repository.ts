import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import {
  CreateDraftInput,
  UpdateDraftInput,
  UploadMediaInput,
  DeleteMediaInput,
  DraftPostOutput,
  UploadMediaOutput,
  PublishPostInput,
  PublishPostOutput,
  PublishAccountResult,
} from '@/application/dto/post.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { TikTokApiClient } from '@/infrastructure/external-services/tiktok-api';
import { decryptToken } from '@/infrastructure/encryption/aes';
import { AppError, NotFoundError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { randomUUID } from 'crypto';
import path from 'path';
import { logger } from '@/infrastructure/logger';

export class SupabaseDraftPostRepository implements IDraftPostRepository {
  constructor(
    private readonly supabase: SupabaseClientFactory,
    private readonly tiktokApi: TikTokApiClient,
  ) {}

  async create(input: CreateDraftInput): Promise<DraftPostOutput> {
    const admin = this.supabase.getAdmin();
    const { data, error } = await admin
      .from('posts')
      .insert({
        user_id: input.userId,
        social_account_ids: input.socialAccountIds || [],
        name: input.name || '',
        description: input.description || '',
        content: input.content,
        media_type: input.mediaType,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new AppError(EC.SYS500001, error?.message || 'Failed to create draft', 500);
    }

    return this.toOutput(data);
  }

  async update(input: UpdateDraftInput): Promise<DraftPostOutput> {
    const admin = this.supabase.getAdmin();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.content !== undefined) updates.content = input.content;
    if (input.socialAccountIds !== undefined) updates.social_account_ids = input.socialAccountIds;
    if (input.mediaUrls !== undefined) updates.media_urls = input.mediaUrls;

    const { data, error } = await admin
      .from('posts')
      .update(updates)
      .eq('id', input.id)
      .eq('user_id', input.userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new NotFoundError('Draft not found');
    }

    return this.toOutput(data);
  }

  async findById(id: string, userId: string): Promise<DraftPostOutput> {
    const admin = this.supabase.getAdmin();
    const { data, error } = await admin
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Draft not found');
    }

    return this.toOutput(data);
  }

  async listByUser(userId: string): Promise<DraftPostOutput[]> {
    const admin = this.supabase.getAdmin();
    const { data, error } = await admin
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new AppError(EC.SYS500001, error.message, 500);
    }

    return (data || []).map((row) => this.toOutput(row));
  }

  async delete(id: string, userId: string): Promise<void> {
    const admin = this.supabase.getAdmin();

    // Get draft to find media files to clean up
    const { data: draft } = await admin
      .from('posts')
      .select('media_urls')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (draft && draft.media_urls && draft.media_urls.length > 0) {
      const filePaths = draft.media_urls.map((url: string) => this.extractStoragePath(url));
      await admin.storage.from('media').remove(filePaths);
    }

    const { error } = await admin
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(EC.SYS500001, error.message, 500);
    }
  }

  async uploadMedia(input: UploadMediaInput): Promise<UploadMediaOutput> {
    const admin = this.supabase.getAdmin();

    // Verify draft exists and belongs to user
    const { data: draft, error: draftError } = await admin
      .from('posts')
      .select('id, media_urls')
      .eq('id', input.draftId)
      .eq('user_id', input.userId)
      .single();

    if (draftError || !draft) {
      throw new NotFoundError('Draft not found');
    }

    const ext = path.extname(input.file.originalname) || '.jpg';
    const storagePath = `${input.userId}/${input.draftId}/${randomUUID()}${ext}`;

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(storagePath, input.file.buffer, {
        contentType: input.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new AppError(EC.SYS500001, uploadError.message, 500);
    }

    const { data: publicUrl } = admin.storage.from('media').getPublicUrl(storagePath);

    // Append URL to draft's media_urls
    const updatedUrls = [...(draft.media_urls || []), publicUrl.publicUrl];
    await admin
      .from('posts')
      .update({ media_urls: updatedUrls, updated_at: new Date().toISOString() })
      .eq('id', input.draftId);

    return { url: publicUrl.publicUrl };
  }

  async deleteMedia(input: DeleteMediaInput): Promise<void> {
    const admin = this.supabase.getAdmin();

    // Verify draft exists and belongs to user
    const { data: draft, error: draftError } = await admin
      .from('posts')
      .select('id, media_urls')
      .eq('id', input.draftId)
      .eq('user_id', input.userId)
      .single();

    if (draftError || !draft) {
      throw new NotFoundError('Draft not found');
    }

    const storagePath = this.extractStoragePath(input.mediaUrl);
    await admin.storage.from('media').remove([storagePath]);

    // Remove URL from draft's media_urls
    const updatedUrls = (draft.media_urls || []).filter((url: string) => url !== input.mediaUrl);
    await admin
      .from('posts')
      .update({ media_urls: updatedUrls, updated_at: new Date().toISOString() })
      .eq('id', input.draftId);
  }

  private extractStoragePath(publicUrl: string): string {
    // Public URL format: {supabaseUrl}/storage/v1/object/public/media/{path}
    const marker = '/storage/v1/object/public/media/';
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return publicUrl;
    return publicUrl.slice(idx + marker.length);
  }

  private toOutput(row: Record<string, unknown>): DraftPostOutput {
    return {
      id: row.id as string,
      socialAccountIds: (row.social_account_ids as string[]) || [],
      name: (row.name as string) || '',
      description: (row.description as string) || '',
      content: row.content as string,
      mediaType: row.media_type as DraftPostOutput['mediaType'],
      mediaUrls: (row.media_urls as string[]) || [],
      status: row.status as DraftPostOutput['status'],
      scheduledAt: (row.scheduled_at as string) || null,
      publishedAt: (row.published_at as string) || null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  async publish(input: PublishPostInput): Promise<PublishPostOutput> {
    logger.info('Publish started', { postId: input.postId, userId: input.userId, privacyLevel: input.privacyLevel });
    const admin = this.supabase.getAdmin();

    // 1. Fetch the post
    const { data: post, error: postError } = await admin
      .from('posts')
      .select('*')
      .eq('id', input.postId)
      .eq('user_id', input.userId)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post not found');
    }

    const mediaUrls = (post.media_urls as string[]) || [];
    if (mediaUrls.length === 0) {
      throw new AppError(EC.POST400003, 'Post has no media to publish', 400);
    }

    const socialAccountIds = (post.social_account_ids as string[]) || [];
    if (socialAccountIds.length === 0) {
      throw new AppError(EC.POST400004, 'No social accounts selected', 400);
    }

    // 2. Fetch social accounts with tokens
    const { data: accounts, error: accError } = await admin
      .from('social_accounts')
      .select('id, platform, access_token, token_expires_at, access_token_expires_at')
      .in('id', socialAccountIds)
      .eq('user_id', input.userId);

    if (accError || !accounts || accounts.length === 0) {
      logger.error('No valid social accounts found', { accError, socialAccountIds, userId: input.userId });
      throw new AppError(EC.POST400004, 'No valid social accounts found', 400);
    }

    // 3. Publish to each account
    const results: PublishAccountResult[] = [];
    const title = (post.content as string) || (post.name as string) || '';
    const mediaType = post.media_type as string;
    logger.info('Publish details', {
      postId: input.postId,
      mediaType,
      mediaCount: mediaUrls.length,
      accountCount: accounts.length,
      titleLength: title.length,
    });

    for (const account of accounts) {
      const tokenExpiresAt = account.access_token_expires_at || account.token_expires_at;
      const isTokenExpired = tokenExpiresAt ? new Date(tokenExpiresAt) <= new Date() : false;

      if (isTokenExpired) {
        results.push({
          socialAccountId: account.id,
          platform: account.platform,
          success: false,
          error: 'Account token is expired or revoked',
        });
        continue;
      }

      try {
        const accessToken = decryptToken(account.access_token);

        if (account.platform === 'tiktok') {
          let publishResult: { publishId: string };

          if (mediaType === 'video') {
            publishResult = await this.tiktokApi.publishVideo(accessToken, {
              title,
              videoUrl: mediaUrls[0],
              privacyLevel: input.privacyLevel,
            });
          } else {
            publishResult = await this.tiktokApi.publishPhoto(accessToken, {
              title,
              photoUrls: mediaUrls,
              privacyLevel: input.privacyLevel,
            });
          }

          results.push({
            socialAccountId: account.id,
            platform: account.platform,
            success: true,
            publishId: publishResult.publishId,
          });

          // Poll publish status
          try {
            const status = await this.tiktokApi.getPublishStatus(accessToken, publishResult.publishId);
            logger.info('TikTok publish status after publish', {
              accountId: account.id,
              publishId: publishResult.publishId,
              status: status.status,
              failReason: status.fail_reason,
            });
          } catch (statusErr) {
            logger.warn('Failed to check publish status (non-blocking)', { accountId: account.id, error: statusErr });
          }
        } else {
          results.push({
            socialAccountId: account.id,
            platform: account.platform,
            success: false,
            error: `Publishing to ${account.platform} is not yet supported`,
          });
        }
      } catch (error) {
        logger.error('Publish to account failed', { accountId: account.id, error });
        results.push({
          socialAccountId: account.id,
          platform: account.platform,
          success: false,
          error: error instanceof AppError ? error.message : 'Publish failed',
        });
      }
    }

    // 4. Update post status based on results
    logger.info('Publish results', {
      postId: input.postId,
      results: results.map((r) => ({ accountId: r.socialAccountId, platform: r.platform, success: r.success, error: r.error })),
    });
    const anySuccess = results.some((r) => r.success);
    const newStatus = anySuccess ? 'published' : 'failed';
    const now = new Date().toISOString();

    await admin
      .from('posts')
      .update({
        status: newStatus,
        published_at: anySuccess ? now : null,
        updated_at: now,
      })
      .eq('id', input.postId);

    return {
      id: input.postId,
      status: newStatus,
      publishedAt: anySuccess ? now : null,
      results,
    };
  }
}
