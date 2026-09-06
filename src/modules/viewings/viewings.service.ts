import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';
import { NotificationsService } from '../notifications/notifications.service';

const CONFLICT_WINDOW_MINUTES = 60;

export const ViewingsService = {
    // Prevents double-booking a room viewing slot: rejects a new request if an
    // approved viewing already exists within +/- 60 minutes of the requested time.
    async create(tenantId: string, data: { roomId: string; requestedDate: string; note?: string }) {
        const room = await prisma.room.findFirst({ where: { id: data.roomId, deletedAt: null } });
        if (!room) throw new AppError(404, 'Room not found.');

        const requested = new Date(data.requestedDate);
        const windowStart = new Date(requested.getTime() - CONFLICT_WINDOW_MINUTES * 60000);
        const windowEnd = new Date(requested.getTime() + CONFLICT_WINDOW_MINUTES * 60000);

        const conflict = await prisma.viewingRequest.findFirst({
            where: {
                roomId: data.roomId,
                status: 'APPROVED',
                deletedAt: null,
                requestedDate: { gte: windowStart, lte: windowEnd },
            },
        });
        if (conflict) throw new AppError(409, 'This time slot conflicts with an already approved viewing.');

        return prisma.viewingRequest.create({
            data: { tenantId, roomId: data.roomId, requestedDate: requested, note: data.note },
        });
    },

    async myRequests(tenantId: string) {
        return prisma.viewingRequest.findMany({
            where: { tenantId, deletedAt: null },
            include: { room: { include: { property: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    // Requests for rooms owned by this owner (or all, for admin)
    async incomingRequests(ownerId: string, isAdmin: boolean) {
        const where: any = { deletedAt: null };
        if (!isAdmin) where.room = { property: { ownerId } };
        return prisma.viewingRequest.findMany({
            where,
            include: { room: { include: { property: true } }, tenant: { select: { id: true, name: true, email: true } } },
            orderBy: { requestedDate: 'asc' },
        });
    },

    async updateStatus(userId: string, isAdmin: boolean, viewingId: string, status: string) {
        const viewing = await prisma.viewingRequest.findFirst({
            where: { id: viewingId, deletedAt: null },
            include: { room: { include: { property: true } } },
        });
        if (!viewing) throw new AppError(404, 'Viewing request not found.');
        if (!isAdmin && viewing.room.property.ownerId !== userId) {
            throw new AppError(403, 'You do not manage this property.');
        }

        const updated = await prisma.viewingRequest.update({
            where: { id: viewingId },
            data: { status: status as any },
        });

        await recordAuditLog({ userId, action: `VIEWING_${status}`, entityType: 'ViewingRequest', entityId: viewingId });

        await NotificationsService.notify({
            userId: viewing.tenantId,
            type: 'VIEWING',
            title: `Viewing request ${status.toLowerCase()}`,
            message: `Your viewing request for room ${viewing.room.roomNumber} was ${status.toLowerCase()}.`,
        });

        return updated;
    },
};
