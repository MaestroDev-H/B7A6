import { Response } from 'express';

interface SuccessPayload<T> {
    statusCode?: number;
    message: string;
    data?: T;
    meta?: Record<string, unknown>;
}

export function sendSuccess<T>(res: Response, { statusCode = 200, message, data, meta }: SuccessPayload<T>) {
    return res.status(statusCode).json({
        success: true,
        message,
        data: data ?? null,
        ...(meta ? { meta } : {}),
    });
}

export function sendError(res: Response, statusCode: number, message: string, errors: unknown[] = []) {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
}
