import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { ApplicationsService } from './applications.service';

export const ApplicationsController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const application = await ApplicationsService.create(req.user!.userId, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Application submitted successfully', data: application });
    }),

    myApplications: catchAsync(async (req: Request, res: Response) => {
        const applications = await ApplicationsService.myApplications(req.user!.userId);
        sendSuccess(res, { message: 'Your applications fetched successfully', data: applications });
    }),

    incoming: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const applications = await ApplicationsService.incomingApplications(req.user!.userId, isAdmin, req.query.status as string);
        sendSuccess(res, { message: 'Incoming applications fetched successfully', data: applications });
    }),

    review: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const result = await ApplicationsService.review(req.user!.userId, isAdmin, req.params.id, req.body.status);
        sendSuccess(res, { message: `Application ${req.body.status.toLowerCase()} successfully`, data: result });
    }),

    withdraw: catchAsync(async (req: Request, res: Response) => {
        const application = await ApplicationsService.withdraw(req.user!.userId, req.params.id);
        sendSuccess(res, { message: 'Application withdrawn successfully', data: application });
    }),
};
