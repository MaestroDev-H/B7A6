import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { PropertiesService } from './properties.service';

export const PropertiesController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const property = await PropertiesService.create(req.user!.userId, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Property created successfully', data: property });
    }),

    list: catchAsync(async (req: Request, res: Response) => {
        const result = await PropertiesService.list({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 10,
            city: req.query.city as string,
            type: req.query.type as string,
            minRent: req.query.minRent ? Number(req.query.minRent) : undefined,
            maxRent: req.query.maxRent ? Number(req.query.maxRent) : undefined,
            sortBy: req.query.sortBy as string,
            order: req.query.order as 'asc' | 'desc',
            search: req.query.search as string,
        });
        sendSuccess(res, {
            message: 'Properties fetched successfully',
            data: result.items,
            meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const property = await PropertiesService.getById(req.params.id);
        sendSuccess(res, { message: 'Property fetched successfully', data: property });
    }),

    myProperties: catchAsync(async (req: Request, res: Response) => {
        const properties = await PropertiesService.myProperties(req.user!.userId);
        sendSuccess(res, { message: 'Your properties fetched successfully', data: properties });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const property = await PropertiesService.update(req.user!.userId, isAdmin, req.params.id, req.body);
        sendSuccess(res, { message: 'Property updated successfully', data: property });
    }),

    remove: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        await PropertiesService.softDelete(req.user!.userId, isAdmin, req.params.id);
        sendSuccess(res, { message: 'Property deleted successfully' });
    }),
};
