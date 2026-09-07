import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { Role } from '@prisma/client';
import { recordAuditLog } from '../../utils/auditLog';
import { sendMail } from '../../config/mailer';

interface RegisterInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'OWNER' | 'TENANT';
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, name: string, otp: string) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #1e3a8a; margin-bottom: 8px;">Verify Your Email Address 🏠</h2>
        <p style="color: #4b5563; font-size: 15px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #4b5563; font-size: 15px;">Thank you for creating an account with Housing & Roommate Platform. Please use the 6-digit verification code below to activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 14px 32px; background-color: #f3f4f6; border: 2px dashed #3b82f6; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code will expire in <strong>15 minutes</strong>. If you did not create an account, please safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Housing & Roommate Management Platform</p>
    </div>
    `;
    await sendMail(email, 'Verify Your Email — Housing Platform', html);
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
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: true }, ...tokens };
    },

    async register(input: RegisterInput) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing) throw new AppError(409, 'An account with this email already exists.');

        const hashedPassword = await bcrypt.hash(input.password, env.bcryptSaltRounds);
        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        const user = await prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                password: hashedPassword,
                phone: input.phone,
                role: input.role ?? Role.TENANT, // never trust a client-supplied ADMIN role
                isVerified: false,
                verificationOtp: otp,
                verificationOtpExpires: otpExpires,
            },
        });

        // Send real email with OTP (non-blocking)
        sendVerificationEmail(user.email, user.name, otp).catch((err) => {
            console.error('[auth] failed to send verification email:', err);
        });

        await recordAuditLog({ userId: user.id, action: 'USER_REGISTERED', entityType: 'User', entityId: user.id });

        return {
            user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: false },
            message: 'Registration successful! A 6-digit verification code has been sent to your email.',
        };
    },

    async verifyEmail(email: string, otp: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deletedAt) throw new AppError(404, 'User not found.');

        if (user.isVerified) {
            const tokens = await issueTokens(user);
            return {
                user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: true },
                ...tokens,
            };
        }

        if (!user.verificationOtp || user.verificationOtp !== otp) {
            throw new AppError(400, 'Invalid verification code.');
        }

        if (!user.verificationOtpExpires || user.verificationOtpExpires < new Date()) {
            throw new AppError(400, 'Verification code has expired. Please request a new code.');
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationOtp: null,
                verificationOtpExpires: null,
            },
        });

        const tokens = await issueTokens(updatedUser);
        await recordAuditLog({ userId: updatedUser.id, action: 'EMAIL_VERIFIED', entityType: 'User', entityId: updatedUser.id });

        return {
            user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, isVerified: true },
            ...tokens,
        };
    },

    async resendOtp(email: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deletedAt) throw new AppError(404, 'User not found.');

        if (user.isVerified) {
            throw new AppError(400, 'Email is already verified. You can log in directly.');
        }

        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationOtp: otp,
                verificationOtpExpires: otpExpires,
            },
        });

        sendVerificationEmail(user.email, user.name, otp).catch((err) => {
            console.error('[auth] failed to resend verification email:', err);
        });

        await recordAuditLog({ userId: user.id, action: 'OTP_RESENT', entityType: 'User', entityId: user.id });

        return {
            email: user.email,
            message: 'A new 6-digit verification code has been sent to your email.',
        };
    },

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deletedAt || !user.isActive || !user.password) {
            throw new AppError(401, 'Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new AppError(401, 'Invalid email or password.');

        if (!user.isVerified) {
            throw new AppError(403, 'Email is not verified. Please verify your email using /auth/verify-email or request a new code via /auth/resend-otp.');
        }

        const tokens = await issueTokens(user);
        await recordAuditLog({ userId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id });

        return {
            user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: true },
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

