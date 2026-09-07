import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { recordAuditLog } from '../../utils/auditLog';

const SAFE_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    avatar: true,
    role: true,
    isVerified: true,
    isActive: true,
    createdAt: true,
};

export const UsersService = {
    async getMe(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_SELECT });
        if (!user) throw new AppError(404, 'User not found.');
        return user;
    },

    async updateMe(userId: string, data: { name?: string; phone?: string; avatar?: string }) {
        return prisma.user.update({ where: { id: userId }, data, select: SAFE_SELECT });
    },

    async listUsers(params: { page: number; limit: number; role?: string; search?: string }) {
        const { page, limit, role, search } = params;
        const where: any = { deletedAt: null };
        if (role) where.role = role;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: SAFE_SELECT,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },

    async updateRole(adminId: string, targetUserId: string, role: 'ADMIN' | 'OWNER' | 'TENANT') {
        const target = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target) throw new AppError(404, 'User not found.');

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { role },
            select: SAFE_SELECT,
        });

        await recordAuditLog({
            userId: adminId,
            action: 'USER_ROLE_UPDATED',
            entityType: 'User',
            entityId: targetUserId,
            metadata: { previousRole: target.role, newRole: role },
        });

        return updated;
    },

    async deactivateUser(adminId: string, targetUserId: string) {
        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { isActive: false, deletedAt: new Date(), refreshToken: null }, // soft delete & revoke tokens
            select: SAFE_SELECT,
        });
        await recordAuditLog({ userId: adminId, action: 'USER_DEACTIVATED', entityType: 'User', entityId: targetUserId });
        return updated;
    },
};
