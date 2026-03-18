import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import {
  CreateDraftInput,
  UpdateDraftInput,
  UploadMediaInput,
  DeleteMediaInput,
  DraftPostOutput,
  UploadMediaOutput,
} from '@/application/dto/post.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { AppError, NotFoundError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { randomUUID } from 'crypto';
import path from 'path';

export class SupabaseDraftPostRepository implements IDraftPostRepository {
  constructor(private readonly supabase: SupabaseClientFactory) {}

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
}
