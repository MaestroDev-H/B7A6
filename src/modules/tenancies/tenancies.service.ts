import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';

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
        return prisma.invoice.findMany({
            where: { recipientId: tenantId },
            include: { tenancy: { include: { room: { include: { property: true } } } }, payments: true },
            orderBy: { dueDate: 'asc' },
        });
    },
};
