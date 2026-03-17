import * as EC from '../enums/error-codes';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = EC.AUTH401001) {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = EC.AUTH403001) {
    super(code, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = EC.SYS404001) {
    super(code, message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = EC.SYS400001) {
    super(code, message, 400);
  }
}
