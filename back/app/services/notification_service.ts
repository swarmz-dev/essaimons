import { inject } from '@adonisjs/core';
import Notification, { NotificationTypeEnum } from '#models/notification';
import UserNotification, { DeliveryStatusEnum } from '#models/user_notification';
import NotificationSetting from '#models/notification_setting';
import User from '#models/user';
import BrevoMailService from '#services/brevo_mail_service';
import logger from '@adonisjs/core/services/logger';
import db from '@adonisjs/lucid/services/db';

interface NotificationPayload {
    type: NotificationTypeEnum;
    titleKey: string;
    messageKey: string;
    data?: Record<string, any>;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
}

interface ChannelPreferences {
    inApp: boolean;
    email: boolean;
    push: boolean;
}

@inject()
export default class NotificationService {
    // @ts-ignore - Will be used in Phase 6 for email notifications
    constructor(private readonly _brevoMailService: BrevoMailService) {}

    /**
     * Create a notification and fan-out to multiple users
     */
    public async create(payload: NotificationPayload, userIds: string[]): Promise<Notification> {
        // Create the notification
        const notification = await Notification.create({
            type: payload.type,
            titleKey: payload.titleKey,
            messageKey: payload.messageKey,
            data: payload.data || {},
            entityType: payload.entityType || null,
            entityId: payload.entityId || null,
            actionUrl: payload.actionUrl || null,
        });

        // Fan-out to users
        const userNotifications: UserNotification[] = [];

        for (const userId of userIds) {
            const preferences = await this.getUserPreferences(userId, payload.type);

            const userNotification = await UserNotification.create({
                userId,
                notificationId: notification.id,
                isRead: false,
                inAppStatus: preferences.inApp ? DeliveryStatusEnum.PENDING : DeliveryStatusEnum.SKIPPED,
                emailStatus: preferences.email ? DeliveryStatusEnum.PENDING : DeliveryStatusEnum.SKIPPED,
                pushStatus: preferences.push ? DeliveryStatusEnum.PENDING : DeliveryStatusEnum.SKIPPED,
            });

            userNotifications.push(userNotification);
        }

        // Send to channels asynchronously (don't wait)
        this.sendToChannels(notification, userNotifications).catch((error) => {
            logger.error({ err: error }, 'Failed to send notifications to channels');
        });

        return notification;
    }

    /**
     * Get user preferences for a notification type
     */
    private async getUserPreferences(userId: string, type: NotificationTypeEnum): Promise<ChannelPreferences> {
        const setting = await NotificationSetting.query().where('user_id', userId).where('notification_type', type).first();

        // Default: all channels enabled if no setting exists
        if (!setting) {
            return {
                inApp: true,
                email: true,
                push: true,
            };
        }

        return {
            inApp: setting.inAppEnabled,
            email: setting.emailEnabled,
            push: setting.pushEnabled,
        };
    }

    /**
     * Send notifications to all enabled channels
     */
    private async sendToChannels(notification: Notification, userNotifications: UserNotification[]): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const userNotification of userNotifications) {
            // In-app notifications are handled by Postgres NOTIFY trigger + SSE
            // Just mark as sent immediately since trigger handles delivery
            if (userNotification.inAppStatus === DeliveryStatusEnum.PENDING) {
                promises.push(this.markInAppSent(userNotification));
            }

            // Email notifications
            if (userNotification.emailStatus === DeliveryStatusEnum.PENDING) {
                promises.push(this.sendEmail(notification, userNotification));
            }

            // Push notifications (will be handled by pg-boss queue in WebPushService)
            if (userNotification.pushStatus === DeliveryStatusEnum.PENDING) {
                promises.push(this.enqueuePush(notification, userNotification));
            }
        }

        await Promise.allSettled(promises);
    }

    /**
     * Mark in-app notification as sent
     */
    private async markInAppSent(userNotification: UserNotification): Promise<void> {
        try {
            userNotification.inAppStatus = DeliveryStatusEnum.SENT;
            userNotification.inAppSentAt = new Date() as any;
            await userNotification.save();
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to mark in-app notification as sent');
            userNotification.inAppStatus = DeliveryStatusEnum.FAILED;
            await userNotification.save();
        }
    }

    /**
     * Send email notification
     */
    private async sendEmail(notification: Notification, userNotification: UserNotification): Promise<void> {
        try {
            const user = await User.findOrFail(userNotification.userId);

            // TODO: Implement email templates for each notification type
            // For now, we'll skip email sending and mark as sent
            // This will be implemented in Phase 6

            logger.info(
                {
                    userId: user.id,
                    notificationType: notification.type,
                    titleKey: notification.titleKey,
                },
                'Email notification queued (not implemented yet)'
            );

            userNotification.emailStatus = DeliveryStatusEnum.SKIPPED;
            userNotification.emailSentAt = new Date() as any;
            await userNotification.save();
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to send email notification');
            userNotification.emailStatus = DeliveryStatusEnum.FAILED;
            await userNotification.save();
        }
    }

    /**
     * Enqueue push notification (will be processed by pg-boss worker)
     */
    private async enqueuePush(notification: Notification, userNotification: UserNotification): Promise<void> {
        try {
            // TODO: Implement pg-boss queue for push notifications
            // This will be implemented in WebPushService

            logger.info(
                {
                    userId: userNotification.userId,
                    notificationType: notification.type,
                },
                'Push notification queued (not implemented yet)'
            );

            userNotification.pushStatus = DeliveryStatusEnum.SKIPPED;
            userNotification.pushSentAt = new Date() as any;
            await userNotification.save();
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to enqueue push notification');
            userNotification.pushStatus = DeliveryStatusEnum.FAILED;
            await userNotification.save();
        }
    }

    /**
     * Mark notification as read
     */
    public async markAsRead(userNotificationId: string, userId: string): Promise<UserNotification | null> {
        const userNotification = await UserNotification.query().where('id', userNotificationId).where('user_id', userId).first();

        if (!userNotification) {
            return null;
        }

        if (!userNotification.isRead) {
            userNotification.isRead = true;
            userNotification.readAt = new Date() as any;
            await userNotification.save();
        }

        return userNotification;
    }

    /**
     * Get unread count for a user
     */
    public async getUnreadCount(userId: string): Promise<number> {
        const result = await db.from('user_notifications').where('user_id', userId).where('is_read', false).count('* as total').first();

        return Number(result?.total || 0);
    }

    /**
     * Get paginated notifications for a user
     */
    public async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
        const query = UserNotification.query().where('user_id', userId).preload('notification').orderBy('created_at', 'desc').paginate(page, limit);

        return query;
    }
}
