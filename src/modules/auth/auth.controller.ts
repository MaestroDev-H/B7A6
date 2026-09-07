import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';

export const AuthController = {
    register: catchAsync(async (req: Request, res: Response) => {
        const result = await AuthService.register(req.body);
        sendSuccess(res, { statusCode: 201, message: result.message, data: result.user });
    }),

    verifyEmail: catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await AuthService.verifyEmail(email, otp);
        sendSuccess(res, { message: 'Email verified successfully', data: result });
    }),

    resendOtp: catchAsync(async (req: Request, res: Response) => {
        const { email } = req.body;
        const result = await AuthService.resendOtp(email);
        sendSuccess(res, { message: result.message, data: { email: result.email } });
    }),

    login: catchAsync(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        sendSuccess(res, { message: 'Login successful', data: result });
    }),

    refreshToken: catchAsync(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        const result = await AuthService.refresh(refreshToken);
        sendSuccess(res, { message: 'Token refreshed', data: result });
    }),

    logout: catchAsync(async (req: Request, res: Response) => {
        await AuthService.logout(req.user!.userId);
        sendSuccess(res, { message: 'Logged out successfully' });
    }),

    changePassword: catchAsync(async (req: Request, res: Response) => {
        const { oldPassword, newPassword } = req.body;
        await AuthService.changePassword(req.user!.userId, oldPassword, newPassword);
        sendSuccess(res, { message: 'Password updated successfully' });
    }),

    // Hit only after passport's Google strategy has already verified the
    // account and attached it to req.user (Passport's own req.user, set via
    // `done(null, user)` in config/passport.ts - not our JWT req.user).
    googleCallback: catchAsync(async (req: Request, res: Response) => {
        const googleUser = req.user as unknown as User;
        const result = await AuthService.issueTokensForOAuthUser(googleUser);
        sendSuccess(res, { message: 'Google login successful', data: result });
    }),
};
