import type {
  CreateDraftCtx,
  UpdateDraftCtx,
  GetDraftCtx,
  ListDraftsCtx,
  DeleteDraftCtx,
  UploadDraftMediaCtx,
  DeleteDraftMediaCtx,
  PublishPostCtx,
} from './types';
import { getUserId } from '@/types/context';
import { CreateDraftPostUseCase } from '@/application/use-cases/posts/create-post';
import { UpdateDraftPostUseCase } from '@/application/use-cases/posts/update-post';
import { GetDraftPostUseCase } from '@/application/use-cases/posts/get-post';
import { ListDraftPostsUseCase } from '@/application/use-cases/posts/list-posts';
import { DeleteDraftPostUseCase } from '@/application/use-cases/posts/delete-post';
import { UploadDraftMediaUseCase } from '@/application/use-cases/posts/upload-media';
import { DeleteDraftMediaUseCase } from '@/application/use-cases/posts/delete-media';
import { PublishPostUseCase } from '@/application/use-cases/posts/publish-post';
import {
  createDraftSchema,
  updateDraftSchema,
  draftIdSchema,
  deleteMediaSchema,
  publishPostSchema,
} from '@/interfaces/http/validators/post.validator';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class DraftPostController {
  constructor(
    private readonly createUseCase: CreateDraftPostUseCase,
    private readonly updateUseCase: UpdateDraftPostUseCase,
    private readonly getUseCase: GetDraftPostUseCase,
    private readonly listUseCase: ListDraftPostsUseCase,
    private readonly deleteUseCase: DeleteDraftPostUseCase,
    private readonly uploadMediaUseCase: UploadDraftMediaUseCase,
    private readonly deleteMediaUseCase: DeleteDraftMediaUseCase,
    private readonly publishUseCase: PublishPostUseCase,
  ) {}

  create = async (ctx: CreateDraftCtx): Promise<void> => {
    const parsed = createDraftSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    const result = await this.createUseCase.execute({
      userId,
      name: parsed.data.name,
      description: parsed.data.description,
      content: parsed.data.content,
      mediaType: parsed.data.mediaType,
      socialAccountIds: parsed.data.socialAccountIds,
    });

    ctx.status = 201;
    ctx.body = {
      code: 'POST201001',
      message: 'Draft created',
      result,
    };
  };

  update = async (ctx: UpdateDraftCtx): Promise<void> => {
    const idParsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!idParsed.success) {
      throw new ValidationError(idParsed.error.errors[0].message, EC.POST400001);
    }

    const bodyParsed = updateDraftSchema.safeParse(ctx.request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    const result = await this.updateUseCase.execute({
      id: idParsed.data.id,
      userId,
      name: bodyParsed.data.name,
      description: bodyParsed.data.description,
      content: bodyParsed.data.content,
      socialAccountIds: bodyParsed.data.socialAccountIds,
      mediaUrls: bodyParsed.data.mediaUrls,
    });

    ctx.status = 200;
    ctx.body = {
      code: 'POST200001',
      message: 'Draft updated',
      result,
    };
  };

  get = async (ctx: GetDraftCtx): Promise<void> => {
    const parsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    const result = await this.getUseCase.execute(parsed.data.id, userId);

    ctx.status = 200;
    ctx.body = {
      code: 'POST200002',
      message: 'Draft retrieved',
      result,
    };
  };

  list = async (ctx: ListDraftsCtx): Promise<void> => {
    const userId = getUserId(ctx);
    const result = await this.listUseCase.execute(userId);

    ctx.status = 200;
    ctx.body = {
      code: 'POST200003',
      message: 'Drafts retrieved',
      result,
    };
  };

  delete = async (ctx: DeleteDraftCtx): Promise<void> => {
    const parsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    await this.deleteUseCase.execute(parsed.data.id, userId);

    ctx.status = 200;
    ctx.body = {
      code: 'POST200004',
      message: 'Draft deleted',
    };
  };

  uploadMedia = async (ctx: UploadDraftMediaCtx): Promise<void> => {
    const parsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.POST400001);
    }

    const file = ctx.file;
    if (!file) {
      throw new ValidationError('File is required', EC.POST400001);
    }

    const userId = getUserId(ctx);
    const result = await this.uploadMediaUseCase.execute({
      draftId: parsed.data.id,
      userId,
      file: {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      },
    });

    ctx.status = 201;
    ctx.body = {
      code: 'POST201002',
      message: 'Media uploaded',
      result,
    };
  };

  deleteMedia = async (ctx: DeleteDraftMediaCtx): Promise<void> => {
    const idParsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!idParsed.success) {
      throw new ValidationError(idParsed.error.errors[0].message, EC.POST400001);
    }

    const bodyParsed = deleteMediaSchema.safeParse(ctx.request.body);
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    await this.deleteMediaUseCase.execute({
      draftId: idParsed.data.id,
      userId,
      mediaUrl: bodyParsed.data.mediaUrl,
    });

    ctx.status = 200;
    ctx.body = {
      code: 'POST200005',
      message: 'Media deleted',
    };
  };

  publish = async (ctx: PublishPostCtx): Promise<void> => {
    const idParsed = draftIdSchema.safeParse({ id: ctx.params.id });
    if (!idParsed.success) {
      throw new ValidationError(idParsed.error.errors[0].message, EC.POST400001);
    }

    const bodyParsed = publishPostSchema.safeParse(ctx.request.body || {});
    if (!bodyParsed.success) {
      throw new ValidationError(bodyParsed.error.errors[0].message, EC.POST400001);
    }

    const userId = getUserId(ctx);
    const result = await this.publishUseCase.execute({
      postId: idParsed.data.id,
      userId,
      privacyLevel: "SELF_ONLY", // Default to self only if not specified
    });

    ctx.status = 200;
    ctx.body = {
      code: 'POST200006',
      message: 'Post published',
      result,
    };
  };
}
