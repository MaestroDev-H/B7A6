import { Router } from 'express';
import passport from 'passport';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } from './auth.validation';
import { authenticate } from '../../middlewares/auth.middleware';
import { authLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// GCP Social Login. Strategy is registered in config/passport.ts. If
// GOOGLE_CLIENT_ID/SECRET are not configured, passport has no 'google'
// strategy and these two routes will throw a clear 500 rather than silently
// misbehaving - configure the env vars to activate them.
router.get('/google', authLimiter, passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/google/failure' }),
    AuthController.googleCallback
);
router.get('/google/failure', (_req, res) => {
    res.status(401).json({ success: false, message: 'Google authentication failed.', errors: [] });
});

router.post('/register', authLimiter, validateRequest(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh-token', validateRequest(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);
router.patch('/change-password', authenticate, validateRequest(changePasswordSchema), AuthController.changePassword);

export const AuthRoutes = router;
