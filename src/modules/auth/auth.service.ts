import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import { recordAuditLog } from '../../utils/auditLog';

interface RegisterInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'OWNER' | 'TENANT';
}

async function issueTokens(user: { id: string; role: Role; email: string }) {
    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });
    return { accessToken, refreshToken };
}

export const AuthService = {
    // Called from the Google OAuth callback once Passport has resolved/created
    // the User record - issues the same access/refresh token pair as local login
    // so the client's downstream API usage is identical regardless of provider.
    async issueTokensForOAuthUser(user: { id: string; role: Role; email: string; name: string }) {
        const tokens = await issueTokens(user);
        await recordAuditLog({ userId: user.id, action: 'USER_LOGIN_GOOGLE', entityType: 'User', entityId: user.id });
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
    },

    async register(input: RegisterInput) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing) throw new AppError(409, 'An account with this email already exists.');

        const hashedPassword = await bcrypt.hash(input.password, env.bcryptSaltRounds);

        const user = await prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                password: hashedPassword,
                phone: input.phone,
                role: input.role ?? Role.TENANT, // never trust a client-supplied ADMIN role
            },
        });

        const tokens = await issueTokens(user);
        await recordAuditLog({ userId: user.id, action: 'USER_REGISTERED', entityType: 'User', entityId: user.id });

        return {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            ...tokens,
        };
    },

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deletedAt || !user.isActive || !user.password) {
            throw new AppError(401, 'Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new AppError(401, 'Invalid email or password.');

        const tokens = await issueTokens(user);
        await recordAuditLog({ userId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id });

        return {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            ...tokens,
        };
    },

    async refresh(token: string) {
        let payload;
        try {
            payload = verifyRefreshToken(token);
        } catch {
            throw new AppError(401, 'Invalid or expired refresh token.');
        }

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user || user.refreshToken !== token) {
            throw new AppError(401, 'Refresh token has been revoked. Please log in again.');
        }

        const tokens = await issueTokens(user);
        return tokens;
    },

    async logout(userId: string) {
        await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    },

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.password) throw new AppError(404, 'User not found.');

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw new AppError(400, 'Old password is incorrect.');

        const hashed = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed, refreshToken: null } });
        await recordAuditLog({ userId, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: userId });
    },
};
