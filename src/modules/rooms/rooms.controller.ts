import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { RoomsService } from './rooms.service';

export const RoomsController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const room = await RoomsService.create(req.user!.userId, req.params.propertyId, req.body);
        sendSuccess(res, { statusCode: 201, message: 'Room added successfully', data: room });
    }),

    listAvailable: catchAsync(async (req: Request, res: Response) => {
        const result = await RoomsService.listAvailable({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 10,
            city: req.query.city as string,
        });
        sendSuccess(res, {
            message: 'Available rooms fetched successfully',
            data: result.items,
            meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const room = await RoomsService.getById(req.params.id);
        sendSuccess(res, { message: 'Room fetched successfully', data: room });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const room = await RoomsService.update(req.user!.userId, isAdmin, req.params.id, req.body);
        sendSuccess(res, { message: 'Room updated successfully', data: room });
    }),

    remove: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        await RoomsService.softDelete(req.user!.userId, isAdmin, req.params.id);
        sendSuccess(res, { message: 'Room deleted successfully' });
    }),
};
