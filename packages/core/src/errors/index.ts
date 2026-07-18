/**
 * Unified Standard Application Errors
 */

export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 500,
        public readonly code: string = 'INTERNAL_ERROR'
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Access denied', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Validation failed', public readonly details: any = null, code = 'VALIDATION_ERROR') {
        super(message, 400, code);
    }
}
