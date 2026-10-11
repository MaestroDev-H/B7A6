import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';
import { stripeClient } from '../payments/stripe.client';
import { NotificationsService } from '../notifications/notifications.service';

export const TenanciesService = {
    async myTenancies(tenantId: string) {
        return prisma.tenancy.findMany({
            where: { tenantId },
            include: { room: { include: { property: true } }, invoices: true },
            orderBy: { createdAt: 'desc' },
        });
    },

    async ownerTenancies(ownerId: string, isAdmin: boolean) {
        const where: any = {};
        if (!isAdmin) where.room = { property: { ownerId } };
        return prisma.tenancy.findMany({
            where,
            include: { room: { include: { property: true } }, tenant: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    async getById(id: string) {
        const tenancy = await prisma.tenancy.findUnique({
            where: { id },
            include: { room: { include: { property: true } }, invoices: { include: { payments: true } }, tenant: true },
        });
        if (!tenancy) throw new AppError(404, 'Tenancy not found.');
        return tenancy;
    },

    // Ending a tenancy must free up the room's occupancy slot in a transaction
    // so the room becomes AVAILABLE again for new applications.
    async end(userId: string, isAdmin: boolean, tenancyId: string, endDate?: string) {
        return prisma.$transaction(async (tx) => {
            const tenancy = await tx.tenancy.findUnique({ where: { id: tenancyId }, include: { room: { include: { property: true } } } });
            if (!tenancy) throw new AppError(404, 'Tenancy not found.');
            if (!isAdmin && tenancy.room.property.ownerId !== userId && tenancy.tenantId !== userId) {
                throw new AppError(403, 'You are not authorized to end this tenancy.');
            }
            if (tenancy.status !== 'ACTIVE') throw new AppError(400, 'Tenancy is not active.');

            const updatedTenancy = await tx.tenancy.update({
                where: { id: tenancyId },
                data: { status: 'ENDED', endDate: endDate ? new Date(endDate) : new Date() },
            });

            const newOccupancy = Math.max(0, tenancy.room.currentOccupancy - 1);
            await tx.room.update({
                where: { id: tenancy.roomId },
                data: { currentOccupancy: newOccupancy, status: 'AVAILABLE' },
            });

            await recordAuditLog({ userId, action: 'TENANCY_ENDED', entityType: 'Tenancy', entityId: tenancyId });
            return updatedTenancy;
        });
    },

    // Generates a rent/utility invoice. For UTILITY invoices in a shared room,
    // the amount is split evenly across all active tenants of that room.
    async generateInvoice(userId: string, isAdmin: boolean, tenancyId: string, data: { type: 'RENT' | 'UTILITY'; amount?: number; dueDate: string }) {
        const tenancy = await prisma.tenancy.findUnique({
            where: { id: tenancyId },
            include: { room: { include: { property: true } } },
        });
        if (!tenancy) throw new AppError(404, 'Tenancy not found.');
        if (!isAdmin && tenancy.room.property.ownerId !== userId) {
            throw new AppError(403, 'You do not manage this property.');
        }

        let amount = data.amount ?? Number(tenancy.rentAmount);

        if (data.type === 'UTILITY') {
            if (!data.amount) throw new AppError(400, 'Utility amount is required.');
            const activeTenantsCount = await prisma.tenancy.count({ where: { roomId: tenancy.roomId, status: 'ACTIVE' } });
            amount = data.amount / Math.max(1, activeTenantsCount); // split bill among current roommates
        }

        const invoice = await prisma.invoice.create({
            data: {
                tenancyId,
                recipientId: tenancy.tenantId,
                type: data.type,
                amount,
                dueDate: new Date(data.dueDate),
            },
        });
        await recordAuditLog({ userId, action: 'INVOICE_GENERATED', entityType: 'Invoice', entityId: invoice.id });
        return invoice;
    },

    async myInvoices(tenantId: string) {
        const invoices = await prisma.invoice.findMany({
            where: { recipientId: tenantId },
            include: { tenancy: { include: { room: { include: { property: true } } } }, payments: true },
            orderBy: { dueDate: 'asc' },
        });

        for (const invoice of invoices) {
            if (invoice.status === 'PENDING') {
                const initiatedPayments = (invoice.payments || [])
                    .filter((p) => p.status === 'INITIATED' && p.stripeSessionId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                for (const initiatedPayment of initiatedPayments) {
                    if (!initiatedPayment.stripeSessionId) continue;
                    try {
                        const session = await stripeClient.checkout.sessions.retrieve(initiatedPayment.stripeSessionId);
                        if (session.payment_status === 'paid' || session.status === 'complete') {
                            const paymentIntentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) ?? null;
                            await prisma.$transaction([
                                prisma.payment.update({
                                    where: { id: initiatedPayment.id },
                                    data: { status: 'SUCCEEDED', stripePaymentIntentId: paymentIntentId },
                                }),
                                prisma.invoice.update({
                                    where: { id: invoice.id },
                                    data: { status: 'PAID', paidAt: new Date() },
                                }),
                            ]);
                            await recordAuditLog({ action: 'PAYMENT_SUCCEEDED', entityType: 'Invoice', entityId: invoice.id });
                            await NotificationsService.notify({
                                userId: tenantId,
                                type: 'PAYMENT',
                                title: 'Payment received ✅',
                                message: `Your payment of ${invoice.amount} was received and the invoice is now marked as paid.`,
                            }).catch(() => {});
                            invoice.status = 'PAID';
                            invoice.paidAt = new Date();
                            initiatedPayment.status = 'SUCCEEDED';
                            initiatedPayment.stripePaymentIntentId = paymentIntentId;
                            break;
                        }
                    } catch {
                        // ignore network/stripe error
                    }
                }
            }
        }

        return invoices;
    },
};
