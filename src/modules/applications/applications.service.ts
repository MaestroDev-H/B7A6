import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';
import { NotificationsService } from '../notifications/notifications.service';

export const ApplicationsService = {
    async create(tenantId: string, data: { roomId: string; moveInDate: string; message?: string }) {
        const room = await prisma.room.findFirst({ where: { id: data.roomId, deletedAt: null } });
        if (!room) throw new AppError(404, 'Room not found.');
        if (room.status !== 'AVAILABLE') throw new AppError(400, 'This room is not currently available.');

        const existing = await prisma.application.findFirst({
            where: { tenantId, roomId: data.roomId, status: 'PENDING', deletedAt: null },
        });
        if (existing) throw new AppError(409, 'You already have a pending application for this room.');

        return prisma.application.create({
            data: {
                tenantId,
                roomId: data.roomId,
                moveInDate: new Date(data.moveInDate),
                message: data.message,
            },
        });
    },

    async myApplications(tenantId: string) {
        return prisma.application.findMany({
            where: { tenantId, deletedAt: null },
            include: { room: { include: { property: true } }, tenancy: true },
            orderBy: { createdAt: 'desc' },
        });
    },

    async incomingApplications(ownerId: string, isAdmin: boolean, status?: string) {
        const where: any = { deletedAt: null };
        if (!isAdmin) where.room = { property: { ownerId } };
        if (status) where.status = status;
        return prisma.application.findMany({
            where,
            include: { room: { include: { property: true } }, tenant: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    },

    // CRITICAL TRANSACTION: approving an application must atomically:
    //  1. Re-check the room still has capacity (prevents double-booking under concurrent approvals)
    //  2. Mark the application APPROVED
    //  3. Create the Tenancy record
    //  4. Increment room occupancy and flip status to OCCUPIED once full
    //  5. Auto-reject any other PENDING applications for the same room if it becomes full
    // All wrapped in prisma.$transaction so a failure at any step rolls everything back.
    async review(userId: string, isAdmin: boolean, applicationId: string, status: 'APPROVED' | 'REJECTED') {
        const result = await prisma.$transaction(async (tx) => {
            const application = await tx.application.findFirst({
                where: { id: applicationId, deletedAt: null },
                include: { room: { include: { property: true } } },
            });
            if (!application) throw new AppError(404, 'Application not found.');
            if (!isAdmin && application.room.property.ownerId !== userId) {
                throw new AppError(403, 'You do not manage this property.');
            }
            if (application.status !== 'PENDING') {
                throw new AppError(400, `Application has already been ${application.status.toLowerCase()}.`);
            }

            if (status === 'REJECTED') {
                const updated = await tx.application.update({
                    where: { id: applicationId },
                    data: { status: 'REJECTED', reviewedById: userId },
                });
                await recordAuditLog({ userId, action: 'APPLICATION_REJECTED', entityType: 'Application', entityId: applicationId });
                await NotificationsService.notify({
                    userId: application.tenantId,
                    type: 'APPLICATION',
                    title: 'Application rejected',
                    message: 'Your room application was not approved this time.',
                });
                return { application: updated, tenancy: null, tenantId: application.tenantId, rejected: true };
            }

            // status === APPROVED
            // Re-fetch room with a fresh read inside the transaction to guard against
            // a race where two applications for the last open slot are approved
            // concurrently.
            const room = await tx.room.findUnique({ where: { id: application.roomId } });
            if (!room) throw new AppError(404, 'Room not found.');
            if (room.currentOccupancy >= room.capacity) {
                throw new AppError(409, 'Room is already at full capacity. Cannot approve another tenant.');
            }

            const updatedApplication = await tx.application.update({
                where: { id: applicationId },
                data: { status: 'APPROVED', reviewedById: userId },
            });

            const tenancy = await tx.tenancy.create({
                data: {
                    applicationId: application.id,
                    tenantId: application.tenantId,
                    roomId: application.roomId,
                    startDate: application.moveInDate,
                    rentAmount: room.rentAmount,
                },
            });

            const newOccupancy = room.currentOccupancy + 1;
            await tx.room.update({
                where: { id: room.id },
                data: {
                    currentOccupancy: newOccupancy,
                    status: newOccupancy >= room.capacity ? 'OCCUPIED' : 'AVAILABLE',
                },
            });

            // If the room is now full, auto-reject remaining pending applications
            if (newOccupancy >= room.capacity) {
                await tx.application.updateMany({
                    where: { roomId: room.id, status: 'PENDING', id: { not: applicationId } },
                    data: { status: 'REJECTED' },
                });
            }

            // Generate the first deposit invoice for the new tenancy
            await tx.invoice.create({
                data: {
                    tenancyId: tenancy.id,
                    recipientId: application.tenantId,
                    type: 'DEPOSIT',
                    amount: room.depositAmount,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            await recordAuditLog({
                userId,
                action: 'APPLICATION_APPROVED',
                entityType: 'Application',
                entityId: applicationId,
                metadata: { tenancyId: tenancy.id },
            });

            return { application: updatedApplication, tenancy, tenantId: application.tenantId, rejected: false };
        });

        if (result.rejected) {
            return { application: result.application, tenancy: null };
        }

        // Fired after the transaction commits - notification failures must never
        // undo an already-successful approval.
        await NotificationsService.notify({
            userId: result.tenantId,
            type: 'APPLICATION',
            title: 'Application approved 🎉',
            message: 'Your room application was approved! A deposit invoice has been generated.',
        });

        return { application: result.application, tenancy: result.tenancy };
    },

    async withdraw(tenantId: string, applicationId: string) {
        const application = await prisma.application.findFirst({ where: { id: applicationId, tenantId, deletedAt: null } });
        if (!application) throw new AppError(404, 'Application not found.');
        if (application.status !== 'PENDING') throw new AppError(400, 'Only pending applications can be withdrawn.');

        return prisma.application.update({ where: { id: applicationId }, data: { status: 'WITHDRAWN' } });
    },
};
