import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import Notification, { NotificationTypeEnum } from '#models/notification';
import UserNotification from '#models/user_notification';
import NotificationSetting from '#models/notification_setting';
import User from '#models/user';
import BrevoMailService from '#services/brevo_mail_service';
import WebPushService from '#services/web_push_service';
import logger from '@adonisjs/core/services/logger';
import db from '@adonisjs/lucid/services/db';
import transmit from '@adonisjs/transmit/services/main';

interface NotificationPayload {
    type: NotificationTypeEnum;
    titleKey: string;
    messageKey: string;
    data?: Record<string, any>;
    entityType?: 'proposition' | 'mandate' | 'deliverable' | 'vote';
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
    constructor(
        // @ts-ignore - Will be used for email notifications in Phase 6
        private readonly _brevoMailService: BrevoMailService,
        private readonly webPushService: WebPushService
    ) {}

    /**
     * Create a notification and fan-out to multiple users
     */
    public async create(payload: NotificationPayload, userIds: string[]): Promise<Notification> {
        // Map entityType and entityId to the appropriate columns
        const entityMapping: Record<string, string | null> = {
            propositionId: payload.entityType === 'proposition' ? payload.entityId || null : null,
            mandateId: payload.entityType === 'mandate' ? payload.entityId || null : null,
            deliverableId: payload.entityType === 'deliverable' ? payload.entityId || null : null,
            voteId: payload.entityType === 'vote' ? payload.entityId || null : null,
        };

        // Create the notification
        const notification = await Notification.create({
            type: payload.type,
            titleKey: payload.titleKey,
            bodyKey: payload.messageKey,
            interpolationData: payload.data || {},
            propositionId: entityMapping.propositionId || null,
            mandateId: entityMapping.mandateId || null,
            deliverableId: entityMapping.deliverableId || null,
            voteId: entityMapping.voteId || null,
            actionUrl: payload.actionUrl || null,
            priority: 'normal',
            metadata: null,
        });

        // Fan-out to users
        const userNotifications: UserNotification[] = [];

        for (const userId of userIds) {
            const userNotification = await UserNotification.create({
                userId,
                notificationId: notification.id,
                read: false,
                inAppSent: false,
                emailSent: false,
                pushSent: false,
                emailError: null,
                pushError: null,
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
            const preferences = await this.getUserPreferences(userNotification.userId, notification.type);

            // In-app notifications via SSE (Transmit)
            if (preferences.inApp && !userNotification.inAppSent) {
                promises.push(this.sendInApp(notification, userNotification));
            }

            // Email notifications
            if (preferences.email && !userNotification.emailSent) {
                promises.push(this.sendEmail(notification, userNotification));
            }

            // Push notifications (will be handled by pg-boss queue in WebPushService)
            if (preferences.push && !userNotification.pushSent) {
                promises.push(this.enqueuePush(notification, userNotification));
            }
        }

        await Promise.allSettled(promises);
    }

    /**
     * Send in-app notification via Transmit SSE
     */
    private async sendInApp(notification: Notification, userNotification: UserNotification): Promise<void> {
        try {
            // Load the user to get their frontId (used by frontend)
            const user = await User.findOrFail(userNotification.userId);
            const userFrontId = user.frontId !== undefined && user.frontId !== null ? String(user.frontId) : user.id;

            // Broadcast directly to user's SSE stream using frontId
            const streamName = `user/${userFrontId}/notifications`;

            await transmit.broadcast(streamName, {
                type: 'notification',
                data: {
                    id: userNotification.id,
                    notificationId: notification.id,
                    type: notification.type,
                    titleKey: notification.titleKey,
                    messageKey: notification.bodyKey,
                    data: notification.interpolationData,
                    actionUrl: notification.actionUrl,
                    isRead: false,
                    createdAt: userNotification.createdAt.toISO(),
                },
            });

            logger.info(
                {
                    userId: userNotification.userId,
                    userFrontId,
                    notificationId: notification.id,
                    streamName,
                },
                'In-app notification broadcast via Transmit'
            );

            userNotification.inAppSent = true;
            userNotification.inAppSentAt = DateTime.now();
            await userNotification.save();
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to send in-app notification');
        }
    }

    /**
     * Send email notification
     */
    private async sendEmail(notification: Notification, userNotification: UserNotification): Promise<void> {
        try {
            const user = await User.findOrFail(userNotification.userId);

            // TODO: Implement email templates for each notification type
            // For now, we'll skip email sending
            // This will be implemented in Phase 6

            logger.info(
                {
                    userId: user.id,
                    notificationType: notification.type,
                    titleKey: notification.titleKey,
                },
                'Email notification queued (not implemented yet)'
            );

            userNotification.emailSent = false; // Not sent yet
            await userNotification.save();
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to send email notification');
            userNotification.emailError = (error as Error).message;
            await userNotification.save();
        }
    }

    /**
     * Send push notification via WebPushService
     */
    private async enqueuePush(notification: Notification, userNotification: UserNotification): Promise<void> {
        try {
            // Send push notification using WebPushService
            await this.webPushService.sendPushNotification(notification, userNotification);

            userNotification.pushSent = true;
            userNotification.pushSentAt = DateTime.now();
            await userNotification.save();

            logger.info(
                {
                    userId: userNotification.userId,
                    notificationType: notification.type,
                },
                'Push notification sent successfully'
            );
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to send push notification');
            userNotification.pushError = (error as Error).message;
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

        if (!userNotification.read) {
            userNotification.read = true;
            userNotification.readAt = DateTime.now();
            await userNotification.save();
        }

        return userNotification;
    }

    /**
     * Get unread count for a user
     */
    public async getUnreadCount(userId: string): Promise<number> {
        const result = await db.from('user_notifications').where('user_id', userId).where('read', false).count('* as total').first();

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
