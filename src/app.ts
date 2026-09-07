import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from './config/passport';
import { env } from './config/env';
import router from './routes';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware';
import { globalLimiter } from './middlewares/rateLimiter';
import { PaymentsController } from './modules/payments/payments.controller';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(globalLimiter);
app.use(passport.initialize()); // stateless (session: false) - JWT remains the source of truth after login

// Stripe webhook needs the RAW request body for signature verification, so
// it must be registered BEFORE express.json() strips/parses the body.
app.post(`/api/${env.apiVersion}/payments/webhook`, express.raw({ type: 'application/json' }), PaymentsController.webhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
    res.json({ success: true, message: 'Housing & Roommate Management Platform API is running 🏠', data: null });
});

app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
});

app.use(`/api/${env.apiVersion}`, router);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
