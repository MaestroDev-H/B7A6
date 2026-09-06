import { prisma } from '../../config/prisma';

export const AdminService = {
    async dashboardStats() {
        const [totalUsers, totalOwners, totalTenants, totalProperties, totalRooms, activeTenancies, pendingApplications, totalRevenueAgg] =
            await Promise.all([
                prisma.user.count({ where: { deletedAt: null } }),
                prisma.user.count({ where: { role: 'OWNER', deletedAt: null } }),
                prisma.user.count({ where: { role: 'TENANT', deletedAt: null } }),
                prisma.property.count({ where: { deletedAt: null } }),
                prisma.room.count({ where: { deletedAt: null } }),
                prisma.tenancy.count({ where: { status: 'ACTIVE' } }),
                prisma.application.count({ where: { status: 'PENDING' } }),
                prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } }),
            ]);

        return {
            totalUsers,
            totalOwners,
            totalTenants,
            totalProperties,
            totalRooms,
            activeTenancies,
            pendingApplications,
            totalRevenue: totalRevenueAgg._sum.amount ?? 0,
        };
    },

    async auditLogs(params: { page: number; limit: number; entityType?: string }) {
        const where: any = {};
        if (params.entityType) where.entityType = params.entityType;

        const [items, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, name: true, role: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (params.page - 1) * params.limit,
                take: params.limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { items, total, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
    },
};
