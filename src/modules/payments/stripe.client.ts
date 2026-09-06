import Stripe from 'stripe';
import { env } from '../../config/env';

// A dedicated Stripe client instance. STRIPE_SECRET_KEY must be a real test
// or live key from the Stripe dashboard for this to actually create sessions.
export const stripeClient = new Stripe(env.stripe.secretKey || 'sk_test_placeholder', {
    apiVersion: '2024-06-20',
});
