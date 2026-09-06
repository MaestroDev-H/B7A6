import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

// Strict role-based middleware. Usage: authorize('ADMIN'), authorize('OWNER', 'ADMIN')
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError(401, 'Authentication required.'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError(403, `Access denied. Requires role: ${allowedRoles.join(' or ')}.`));
        }
        next();
    };
};
