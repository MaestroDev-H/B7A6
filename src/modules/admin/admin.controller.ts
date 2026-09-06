import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { AdminService } from './admin.service';

export const AdminController = {
    dashboardStats: catchAsync(async (_req: Request, res: Response) => {
        const stats = await AdminService.dashboardStats();
        sendSuccess(res, { message: 'Dashboard stats fetched successfully', data: stats });
    }),

    auditLogs: catchAsync(async (req: Request, res: Response) => {
        const result = await AdminService.auditLogs({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            entityType: req.query.entityType as string,
        });
        sendSuccess(res, {
            message: 'Audit logs fetched successfully',
            data: result.items,
            meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
    }),
};
