import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';
import { NotificationsService } from '../notifications/notifications.service';

export const MaintenanceService = {
    async create(tenantId: string, data: any) {
        const tenancy = await prisma.tenancy.findFirst({ where: { id: data.tenancyId, tenantId, status: 'ACTIVE' } });
        if (!tenancy) throw new AppError(404, 'Active tenancy not found for this request.');

        return prisma.maintenanceRequest.create({
            data: { ...data, tenantId },
        });
    },

    async myRequests(tenantId: string) {
        return prisma.maintenanceRequest.findMany({
            where: { tenantId, deletedAt: null },
            include: { tenancy: { include: { room: { include: { property: true } } } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    async ownerRequests(ownerId: string, isAdmin: boolean, status?: string) {
        const where: any = { deletedAt: null };
        if (!isAdmin) where.tenancy = { room: { property: { ownerId } } };
        if (status) where.status = status;
        return prisma.maintenanceRequest.findMany({
            where,
            include: { tenancy: { include: { room: { include: { property: true } } } }, tenant: { select: { id: true, name: true } } },
            orderBy: { priority: 'desc' },
        });
    },

    async updateStatus(userId: string, isAdmin: boolean, id: string, status: string) {
        const request = await prisma.maintenanceRequest.findFirst({
            where: { id, deletedAt: null },
            include: { tenancy: { include: { room: { include: { property: true } } } } },
        });
        if (!request) throw new AppError(404, 'Maintenance request not found.');
        if (!isAdmin && request.tenancy.room.property.ownerId !== userId) {
            throw new AppError(403, 'You do not manage this property.');
        }

        const updated = await prisma.maintenanceRequest.update({ where: { id }, data: { status: status as any } });
        await recordAuditLog({ userId, action: `MAINTENANCE_${status}`, entityType: 'MaintenanceRequest', entityId: id });

        await NotificationsService.notify({
            userId: request.tenantId,
            type: 'MAINTENANCE',
            title: `Maintenance request ${status.toLowerCase().replace('_', ' ')}`,
            message: `Your maintenance request "${request.title}" is now ${status.toLowerCase().replace('_', ' ')}.`,
        });

        return updated;
    },
};
