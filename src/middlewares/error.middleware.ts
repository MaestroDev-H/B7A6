import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';

// Centralized error handler - every thrown error funnels through here so the
// API always returns the standardized { success:false, message, errors } shape.
export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.message, err.errors);
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return sendError(res, 409, 'A record with this value already exists.', [
                { field: (err.meta?.target as string[])?.join(', '), message: 'Must be unique' },
            ]);
        }
        if (err.code === 'P2025') {
            return sendError(res, 404, 'Requested record was not found.');
        }
        return sendError(res, 400, 'Database request error.', [{ code: err.code }]);
    }

    console.error('[unhandled error]', err);
    return sendError(res, 500, 'Something went wrong on the server.');
};

export const notFoundHandler = (req: Request, res: Response) => {
    return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};
