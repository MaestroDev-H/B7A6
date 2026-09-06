import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { NotificationsService } from './notifications.service';

export const NotificationsController = {
    myNotifications: catchAsync(async (req: Request, res: Response) => {
        const unreadOnly = req.query.unread === 'true';
        const notifications = await NotificationsService.myNotifications(req.user!.userId, unreadOnly);
        sendSuccess(res, { message: 'Notifications fetched successfully', data: notifications });
    }),

    markRead: catchAsync(async (req: Request, res: Response) => {
        await NotificationsService.markRead(req.user!.userId, req.params.id);
        sendSuccess(res, { message: 'Notification marked as read' });
    }),

    markAllRead: catchAsync(async (req: Request, res: Response) => {
        await NotificationsService.markAllRead(req.user!.userId);
        sendSuccess(res, { message: 'All notifications marked as read' });
    }),
};
