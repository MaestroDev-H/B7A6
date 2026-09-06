import rateLimit from 'express-rate-limit';

// Generic API rate limit - protects against abuse across all routes.
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.', errors: [] },
});

// Tighter limit for auth endpoints to slow down credential-stuffing/brute force.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth attempts, please try again later.', errors: [] },
});
