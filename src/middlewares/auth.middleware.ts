import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';

declare global {
    namespace Express {
        // Passport also augments Express.Request.user (as `Express.User`), so we
        // merge our JWT payload shape INTO Express.User rather than redeclaring
        // `Request.user` with a different type - that's what TS2717 complains
        // about when two ambient declarations disagree.
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface User extends JwtPayload { }
        interface Request {
            user?: User;
        }
    }
}

// Verifies the Bearer token, ensures the user still exists, is active, and
// has not been soft-deleted. Attaches a minimal payload to req.user for
// downstream RBAC checks.
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            throw new AppError(401, 'Authentication required. Provide a Bearer token.');
        }
        const token = header.split(' ')[1];
        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || user.deletedAt || !user.isActive) {
            throw new AppError(401, 'Account is inactive or no longer exists.');
        }

        req.user = { userId: user.id, role: user.role, email: user.email };
        next();
    } catch (err) {
        if (err instanceof AppError) return next(err);
        next(new AppError(401, 'Invalid or expired access token.'));
    }
};
