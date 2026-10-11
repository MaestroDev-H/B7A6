import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { stripeClient } from './stripe.client';
import { env } from '../../config/env';
import { recordAuditLog } from '../../utils/auditLog';
import { NotificationsService } from '../notifications/notifications.service';
import Stripe from 'stripe';

export const PaymentsService = {
    // STEP 1: Create a Payment record + a Stripe Checkout Session for the invoice.
    // Idempotency: an invoice that's already PAID cannot be paid again; an
    // invoice with an INITIATED payment reuses/returns a fresh session rather
    // than stacking duplicate sessions.
    async initiate(userId: string, invoiceId: string) {
        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { tenancy: { include: { room: { include: { property: true } } } } } });
        if (!invoice) throw new AppError(404, 'Invoice not found.');
        if (invoice.recipientId !== userId) throw new AppError(403, 'This invoice does not belong to you.');
        if (invoice.status === 'PAID') throw new AppError(400, 'Invoice has already been paid.');

        const amountCents = Math.round(Number(invoice.amount) * 100);

        const session = await stripeClient.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: amountCents,
                        product_data: {
                            name: `${invoice.type} - ${invoice.tenancy.room.property.title} (${invoice.tenancy.room.roomNumber})`,
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${env.stripe.successUrl}?invoiceId=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${env.stripe.cancelUrl}?invoiceId=${invoice.id}`,
            metadata: { invoiceId: invoice.id, userId },
        });

        const paymentIntentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) ?? null;

        const payment = await prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                userId,
                amount: invoice.amount,
                status: 'INITIATED',
                stripeSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
            },
        });

        return { payment, checkoutUrl: session.url };
    },

    // STEP 1.5: Direct Stripe verification for immediate client confirmation & fallback
    async verify(userId: string, invoiceId: string, sessionId?: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { tenancy: { include: { room: { include: { property: true } } } }, payments: true },
        });
        if (!invoice) throw new AppError(404, 'Invoice not found.');
        if (invoice.recipientId !== userId) throw new AppError(403, 'This invoice does not belong to you.');

        if (invoice.status === 'PAID') {
            return { invoice, status: 'PAID' };
        }

        // Find matching payment or any initiated payment with stripeSessionId
        let targetSessionId = sessionId;
        let targetPayment = targetSessionId
            ? invoice.payments.find((p) => p.stripeSessionId === targetSessionId)
            : undefined;

        if (!targetSessionId) {
            const initiated = (invoice.payments || [])
                .filter((p) => p.stripeSessionId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (initiated.length > 0) {
                targetSessionId = initiated[0].stripeSessionId!;
                targetPayment = initiated[0];
            }
        }

        if (!targetSessionId) {
            return { invoice, status: invoice.status };
        }

        const session = await stripeClient.checkout.sessions.retrieve(targetSessionId);
        if (session.payment_status === 'paid' || session.status === 'complete') {
            const paymentIntentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) ?? null;

            await prisma.$transaction(async (tx) => {
                if (targetPayment) {
                    await tx.payment.update({
                        where: { id: targetPayment.id },
                        data: { status: 'SUCCEEDED', stripePaymentIntentId: paymentIntentId },
                    });
                } else {
                    await tx.payment.create({
                        data: {
                            invoiceId: invoice.id,
                            userId,
                            amount: invoice.amount,
                            status: 'SUCCEEDED',
                            stripeSessionId: session.id,
                            stripePaymentIntentId: paymentIntentId,
                        },
                    });
                }

                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: { status: 'PAID', paidAt: new Date() },
                });
            });

            await recordAuditLog({ action: 'PAYMENT_SUCCEEDED', entityType: 'Invoice', entityId: invoiceId });

            await NotificationsService.notify({
                userId,
                type: 'PAYMENT',
                title: 'Payment received ✅',
                message: `Your payment of ${invoice.amount} was received and the invoice is now marked as paid.`,
            }).catch(() => {});

            const updatedInvoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: { tenancy: { include: { room: { include: { property: true } } } }, payments: true },
            });

            return { invoice: updatedInvoice, status: 'PAID' };
        }

        return { invoice, status: invoice.status };
    },

    // STEP 2: Stripe webhook - the only trustworthy source of truth for whether
    // money actually moved. Verifies signature, then transactionally marks the
    // Payment SUCCEEDED and the Invoice PAID.
    async handleWebhookEvent(rawBody: Buffer, signature: string) {
        if (!env.stripe.webhookSecret) {
            throw new AppError(500, 'Stripe webhook secret is not configured.');
        }

        let event: Stripe.Event;
        try {
            event = stripeClient.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
        } catch {
            throw new AppError(400, 'Webhook signature verification failed.');
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const invoiceId = session.metadata?.invoiceId;
            if (!invoiceId) return;

            const paymentIntentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) ?? null;

            const outcome = await prisma.$transaction(async (tx) => {
                const payment = await tx.payment.findFirst({ where: { stripeSessionId: session.id } });
                if (!payment || payment.status === 'SUCCEEDED') return null; // idempotent - already processed

                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: 'SUCCEEDED', stripePaymentIntentId: paymentIntentId },
                });
                await tx.invoice.update({
                    where: { id: invoiceId },
                    data: { status: 'PAID', paidAt: new Date() },
                });
                return payment;
            });

            await recordAuditLog({ action: 'PAYMENT_SUCCEEDED', entityType: 'Invoice', entityId: invoiceId });

            if (outcome) {
                await NotificationsService.notify({
                    userId: outcome.userId,
                    type: 'PAYMENT',
                    title: 'Payment received ✅',
                    message: `Your payment of ${outcome.amount} was received and the invoice is now marked as paid.`,
                });
            }
        }

        if (event.type === 'checkout.session.expired') {
            const session = event.data.object as Stripe.Checkout.Session;
            await prisma.payment.updateMany({
                where: { stripeSessionId: session.id },
                data: { status: 'FAILED' },
            });
        }

        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await prisma.payment.updateMany({
                where: { stripePaymentIntentId: paymentIntent.id },
                data: { status: 'FAILED' },
            });
        }
    },

    async getStatus(userId: string, isAdmin: boolean, paymentId: string) {
        const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { invoice: true } });
        if (!payment) throw new AppError(404, 'Payment not found.');
        if (!isAdmin && payment.userId !== userId) throw new AppError(403, 'Not your payment record.');
        return payment;
    },

    async myPayments(userId: string) {
        return prisma.payment.findMany({
            where: { userId },
            include: { invoice: true },
            orderBy: { createdAt: 'desc' },
        });
    },
};
