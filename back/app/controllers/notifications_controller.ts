import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import NotificationService from '#services/notification_service';
import type User from '#models/user';

@inject()
export default class NotificationsController {
    constructor(private readonly notificationService: NotificationService) {}

    /**
     * GET /notifications
     * Get paginated notifications for the authenticated user
     */
    public async index({ request, response, auth }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const page = request.input('page', 1);
        const limit = Math.min(request.input('limit', 20), 50);

        const notifications = await this.notificationService.getUserNotifications(user.id, page, limit);

        return response.ok({
            notifications: notifications.all().map((userNotification) => ({
                id: userNotification.id,
                notificationId: userNotification.notificationId,
                type: userNotification.notification.type,
                titleKey: userNotification.notification.titleKey,
                messageKey: userNotification.notification.messageKey,
                data: userNotification.notification.data,
                actionUrl: userNotification.notification.actionUrl,
                isRead: userNotification.isRead,
                readAt: userNotification.readAt?.toISO() || null,
                createdAt: userNotification.createdAt.toISO(),
            })),
            meta: {
                total: notifications.total,
                perPage: notifications.perPage,
                currentPage: notifications.currentPage,
                lastPage: notifications.lastPage,
                firstPage: notifications.firstPage,
            },
        });
    }

    /**
     * PATCH /notifications/:id/read
     * Mark a notification as read
     */
    public async markAsRead({ request, response, auth, i18n }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const notificationId = request.param('id');

        if (!notificationId || typeof notificationId !== 'string') {
            return response.badRequest({
                error: i18n.t('messages.notifications.invalid_id'),
            });
        }

        const userNotification = await this.notificationService.markAsRead(notificationId, user.id);

        if (!userNotification) {
            return response.notFound({
                error: i18n.t('messages.notifications.not_found'),
            });
        }

        return response.ok({
            id: userNotification.id,
            isRead: userNotification.isRead,
            readAt: userNotification.readAt?.toISO() || null,
        });
    }

    /**
     * PATCH /notifications/mark-all-read
     * Mark all notifications as read for the authenticated user
     */
    public async markAllAsRead({ response, auth }: HttpContext): Promise<void> {
        const user = auth.user as User;

        // Get all unread notifications and mark them as read
        const notifications = await this.notificationService.getUserNotifications(user.id, 1, 1000);
        const unreadNotifications = notifications.all().filter((n) => !n.isRead);

        await Promise.all(unreadNotifications.map((n) => this.notificationService.markAsRead(n.id, user.id)));

        return response.ok({
            markedCount: unreadNotifications.length,
        });
    }

    /**
     * GET /notifications/unread-count
     * Get the count of unread notifications
     */
    public async unreadCount({ response, auth }: HttpContext): Promise<void> {
        const user = auth.user as User;
        const count = await this.notificationService.getUnreadCount(user.id);

        return response.ok({
            count,
        });
    }
}
