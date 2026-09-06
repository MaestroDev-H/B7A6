import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { MaintenanceService } from './maintenance.service';

export const MaintenanceController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const request = await MaintenanceService.create(req.user!.userId, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Maintenance request submitted successfully', data: request });
    }),

    myRequests: catchAsync(async (req: Request, res: Response) => {
        const requests = await MaintenanceService.myRequests(req.user!.userId);
        sendSuccess(res, { message: 'Your maintenance requests fetched successfully', data: requests });
    }),

    ownerRequests: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const requests = await MaintenanceService.ownerRequests(req.user!.userId, isAdmin, req.query.status as string);
        sendSuccess(res, { message: 'Maintenance requests fetched successfully', data: requests });
    }),

    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const request = await MaintenanceService.updateStatus(req.user!.userId, isAdmin, req.params.id, req.body.status);
        sendSuccess(res, { message: 'Maintenance request status updated', data: request });
    }),
};
