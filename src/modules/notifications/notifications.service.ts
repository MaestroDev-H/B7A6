import { prisma } from '../../config/prisma';
import { sendMail } from '../../config/mailer';
import { NotificationType } from '@prisma/client';

interface NotifyInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    emailSubject?: string;
    emailHtml?: string;
}

// Central fan-out point: writes an in-app Notification row (so the frontend
// can show a bell/inbox) AND best-effort emails the user. Used by every
// module that changes state a user cares about (viewing/application status,
// payment success, maintenance updates). Never throws - a notification
// failure must never roll back the business transaction that triggered it.
export const NotificationsService = {
    async notify(input: NotifyInput): Promise<void> {
        try {
            await prisma.notification.create({
                data: { userId: input.userId, type: input.type, title: input.title, message: input.message },
            });
        } catch (err) {
            console.error('[notifications] failed to persist:', err);
        }

        try {
            const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
            if (user?.email) {
                await sendMail(
                    user.email,
                    input.emailSubject || input.title,
                    input.emailHtml || `<p>${input.message}</p>`
                );
            }
        } catch (err) {
            console.error('[notifications] failed to email:', err);
        }
    },

    async myNotifications(userId: string, unreadOnly = false) {
        return prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    },

    async markRead(userId: string, id: string) {
        return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    },

    async markAllRead(userId: string) {
        return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    },
};
