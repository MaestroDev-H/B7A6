import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { cacheGet, cacheSet, cacheDel } from '../../config/redis';
import { recordAuditLog } from '../../utils/auditLog';

interface ListParams {
    page: number;
    limit: number;
    city?: string;
    type?: string;
    minRent?: number;
    maxRent?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    search?: string;
}

export const PropertiesService = {
    async create(ownerId: string, data: any) {
        const property = await prisma.property.create({ data: { ...data, ownerId } });
        await cacheDel('properties:list:*');
        return property;
    },

    // Public search & discovery endpoint. Cached briefly in Redis since
    // property browsing is read-heavy and tolerant of a few seconds of staleness.
    async list(params: ListParams) {
        const { page, limit, city, type, minRent, maxRent, sortBy, order, search } = params;
        const cacheKey = `properties:list:${JSON.stringify(params)}`;
        const cached = await cacheGet<any>(cacheKey);
        if (cached) return cached;

        const where: any = { deletedAt: null, isPublished: true };
        if (city) where.city = { equals: city, mode: 'insensitive' };
        if (type) where.type = type;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (minRent || maxRent) {
            where.rooms = {
                some: {
                    deletedAt: null,
                    rentAmount: {
                        ...(minRent ? { gte: minRent } : {}),
                        ...(maxRent ? { lte: maxRent } : {}),
                    },
                },
            };
        }

        const orderBy = sortBy ? { [sortBy]: order || 'desc' } : { createdAt: 'desc' as const };

        const [items, total] = await Promise.all([
            prisma.property.findMany({
                where,
                include: { rooms: { where: { deletedAt: null } }, owner: { select: { id: true, name: true } } },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.property.count({ where }),
        ]);

        const result = { items, total, page, limit, totalPages: Math.ceil(total / limit) };
        await cacheSet(cacheKey, result, 30);
        return result;
    },

    async getById(id: string) {
        const property = await prisma.property.findFirst({
            where: { id, deletedAt: null },
            include: { rooms: { where: { deletedAt: null } }, owner: { select: { id: true, name: true, phone: true } } },
        });
        if (!property) throw new AppError(404, 'Property not found.');
        return property;
    },

    async update(ownerId: string, isAdmin: boolean, propertyId: string, data: any) {
        const property = await prisma.property.findFirst({ where: { id: propertyId, deletedAt: null } });
        if (!property) throw new AppError(404, 'Property not found.');
        if (!isAdmin && property.ownerId !== ownerId) {
            throw new AppError(403, 'You do not own this property.');
        }
        const updated = await prisma.property.update({ where: { id: propertyId }, data });
        await cacheDel('properties:list:*');
        return updated;
    },

    async softDelete(ownerId: string, isAdmin: boolean, propertyId: string) {
        const property = await prisma.property.findFirst({ where: { id: propertyId, deletedAt: null } });
        if (!property) throw new AppError(404, 'Property not found.');
        if (!isAdmin && property.ownerId !== ownerId) {
            throw new AppError(403, 'You do not own this property.');
        }
        await prisma.property.update({ where: { id: propertyId }, data: { deletedAt: new Date(), isPublished: false } });
        await cacheDel('properties:list:*');
        await recordAuditLog({ userId: ownerId, action: 'PROPERTY_DELETED', entityType: 'Property', entityId: propertyId });
    },

    async myProperties(ownerId: string) {
        return prisma.property.findMany({
            where: { ownerId, deletedAt: null },
            include: { rooms: { where: { deletedAt: null } } },
            orderBy: { createdAt: 'desc' },
        });
    },
};
