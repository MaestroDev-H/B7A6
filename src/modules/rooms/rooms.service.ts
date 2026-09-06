import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { cacheDel } from '../../config/redis';

export const RoomsService = {
    async create(ownerId: string, propertyId: string, data: any) {
        const property = await prisma.property.findFirst({ where: { id: propertyId, deletedAt: null } });
        if (!property) throw new AppError(404, 'Property not found.');
        if (property.ownerId !== ownerId) throw new AppError(403, 'You do not own this property.');

        const room = await prisma.room.create({ data: { ...data, propertyId } });
        await cacheDel('properties:list:*');
        return room;
    },

    async getById(id: string) {
        const room = await prisma.room.findFirst({
            where: { id, deletedAt: null },
            include: { property: true },
        });
        if (!room) throw new AppError(404, 'Room not found.');
        return room;
    },

    async update(userId: string, isAdmin: boolean, roomId: string, data: any) {
        const room = await prisma.room.findFirst({ where: { id: roomId, deletedAt: null }, include: { property: true } });
        if (!room) throw new AppError(404, 'Room not found.');
        if (!isAdmin && room.property.ownerId !== userId) throw new AppError(403, 'You do not own this room.');

        const updated = await prisma.room.update({ where: { id: roomId }, data });
        await cacheDel('properties:list:*');
        return updated;
    },

    async softDelete(userId: string, isAdmin: boolean, roomId: string) {
        const room = await prisma.room.findFirst({ where: { id: roomId, deletedAt: null }, include: { property: true } });
        if (!room) throw new AppError(404, 'Room not found.');
        if (!isAdmin && room.property.ownerId !== userId) throw new AppError(403, 'You do not own this room.');

        await prisma.room.update({ where: { id: roomId }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
        await cacheDel('properties:list:*');
    },

    async listAvailable(params: { page: number; limit: number; city?: string }) {
        const where: any = { deletedAt: null, status: 'AVAILABLE', property: { deletedAt: null, isPublished: true } };
        if (params.city) where.property.city = { equals: params.city, mode: 'insensitive' };

        const [items, total] = await Promise.all([
            prisma.room.findMany({
                where,
                include: { property: { select: { title: true, city: true, address: true } } },
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { rentAmount: 'asc' },
            }),
            prisma.room.count({ where }),
        ]);
        return { items, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
    },
};
