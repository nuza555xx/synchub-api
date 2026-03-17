import { Context, Next } from "koa";
import { AppError } from "../../../domain/errors/app-error";
import { logger } from "../../../infrastructure/logger";

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    if (err instanceof AppError) {
      ctx.status = err.statusCode;
      ctx.body = {
        requestId: ctx.state.requestId,
        status: err.statusCode,
        code: err.code,
        message: err.message,
      };
      return;
    }

    logger.error("Unhandled error", err as Error);
    ctx.status = 500;
    ctx.body = {
      requestId: ctx.state.requestId,
      status: 500,
      code: "SYS500001",
      message: "Internal server error",
      result: null,
    };
  }
}
