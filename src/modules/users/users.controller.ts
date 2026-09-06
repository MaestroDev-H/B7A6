import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { UsersService } from './users.service';

export const UsersController = {
    getMe: catchAsync(async (req: Request, res: Response) => {
        const user = await UsersService.getMe(req.user!.userId);
        sendSuccess(res, { message: 'Profile fetched successfully', data: user });
    }),

    updateMe: catchAsync(async (req: Request, res: Response) => {
        const user = await UsersService.updateMe(req.user!.userId, req.body);
        sendSuccess(res, { message: 'Profile updated successfully', data: user });
    }),

    listUsers: catchAsync(async (req: Request, res: Response) => {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const result = await UsersService.listUsers({
            page,
            limit,
            role: req.query.role as string | undefined,
            search: req.query.search as string | undefined,
        });
        sendSuccess(res, {
            message: 'Users fetched successfully',
            data: result.items,
            meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
    }),

    updateUserRole: catchAsync(async (req: Request, res: Response) => {
        const user = await UsersService.updateRole(req.user!.userId, req.params.id, req.body.role);
        sendSuccess(res, { message: 'User role updated successfully', data: user });
    }),

    deactivateUser: catchAsync(async (req: Request, res: Response) => {
        const user = await UsersService.deactivateUser(req.user!.userId, req.params.id);
        sendSuccess(res, { message: 'User deactivated successfully', data: user });
    }),
};
