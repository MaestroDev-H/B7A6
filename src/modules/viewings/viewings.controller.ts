import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { ViewingsService } from './viewings.service';

export const ViewingsController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const viewing = await ViewingsService.create(req.user!.userId, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Viewing request submitted successfully', data: viewing });
    }),

    myRequests: catchAsync(async (req: Request, res: Response) => {
        const requests = await ViewingsService.myRequests(req.user!.userId);
        sendSuccess(res, { message: 'Your viewing requests fetched successfully', data: requests });
    }),

    incoming: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const requests = await ViewingsService.incomingRequests(req.user!.userId, isAdmin);
        sendSuccess(res, { message: 'Incoming viewing requests fetched successfully', data: requests });
    }),

    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const viewing = await ViewingsService.updateStatus(req.user!.userId, isAdmin, req.params.id, req.body.status);
        sendSuccess(res, { message: 'Viewing request status updated', data: viewing });
    }),
};
