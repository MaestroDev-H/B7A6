import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

// Validates req.body / req.query / req.params against a Zod schema shaped as
// { body?, query?, params? }. Returns a structured 400 error on failure.
export const validateRequest = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const formatted = err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return sendError(res, 400, 'Validation failed', formatted);
            }
            next(err);
        }
    };
};
