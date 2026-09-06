import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { TenanciesService } from './tenancies.service';

export const TenanciesController = {
    myTenancies: catchAsync(async (req: Request, res: Response) => {
        const tenancies = await TenanciesService.myTenancies(req.user!.userId);
        sendSuccess(res, { message: 'Your tenancies fetched successfully', data: tenancies });
    }),

    ownerTenancies: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const tenancies = await TenanciesService.ownerTenancies(req.user!.userId, isAdmin);
        sendSuccess(res, { message: 'Tenancies fetched successfully', data: tenancies });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const tenancy = await TenanciesService.getById(req.params.id);
        sendSuccess(res, { message: 'Tenancy fetched successfully', data: tenancy });
    }),

    end: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const tenancy = await TenanciesService.end(req.user!.userId, isAdmin, req.params.id, req.body.endDate);
        sendSuccess(res, { message: 'Tenancy ended successfully', data: tenancy });
    }),

    generateInvoice: catchAsync(async (req: Request, res: Response) => {
        const invoice = await TenanciesService.generateInvoice(req.user!.userId, req.params.id, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Invoice generated successfully', data: invoice });
    }),

    myInvoices: catchAsync(async (req: Request, res: Response) => {
        const invoices = await TenanciesService.myInvoices(req.user!.userId);
        sendSuccess(res, { message: 'Your invoices fetched successfully', data: invoices });
    }),
};
