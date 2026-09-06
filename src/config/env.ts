import dotenv from 'dotenv';
dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',

    databaseUrl: process.env.DATABASE_URL as string,

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },

    mail: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'Housing Platform <no-reply@housing.com>',
    },

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        successUrl: process.env.CLIENT_SUCCESS_URL || 'http://localhost:5000/api/v1/payments/success',
        cancelUrl: process.env.CLIENT_CANCEL_URL || 'http://localhost:5000/api/v1/payments/cancel',
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    },
};
