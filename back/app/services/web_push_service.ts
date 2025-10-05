import webpush from 'web-push';
import env from '#start/env';
import PushSubscription from '#models/push_subscription';
import Notification from '#models/notification';
import UserNotification from '#models/user_notification';
import logger from '@adonisjs/core/services/logger';

export default class WebPushService {
    private initialized: boolean = false;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize web-push with VAPID keys
     */
    private initialize(): void {
        if (this.initialized) {
            return;
        }

        const vapidSubject = env.get('VAPID_SUBJECT');
        const vapidPublicKey = env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = env.get('VAPID_PRIVATE_KEY');

        if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
            logger.warn('VAPID keys not configured. Web push notifications will be disabled.');
            return;
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        this.initialized = true;
        logger.info('WebPushService initialized with VAPID keys');
    }

    /**
     * Get VAPID public key for client subscription
     */
    public getVapidPublicKey(): string | null {
        const key = env.get('VAPID_PUBLIC_KEY');
        return typeof key === 'string' ? key : null;
    }

    /**
     * Subscribe a user to push notifications
     */
    public async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string): Promise<PushSubscription> {
        // Check if subscription already exists
        const existing = await PushSubscription.query().where('user_id', userId).where('endpoint', subscription.endpoint).first();

        if (existing) {
            existing.p256dhKey = subscription.keys.p256dh;
            existing.authKey = subscription.keys.auth;
            existing.isActive = true;
            existing.lastUsedAt = new Date() as any;
            if (userAgent) {
                existing.userAgent = userAgent;
            }
            await existing.save();
            return existing;
        }

        // Create new subscription
        return PushSubscription.create({
            userId,
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            userAgent: userAgent || null,
            isActive: true,
            lastUsedAt: new Date() as any,
        });
    }

    /**
     * Unsubscribe a device
     */
    public async unsubscribe(subscriptionId: string, userId: string): Promise<boolean> {
        const subscription = await PushSubscription.query().where('id', subscriptionId).where('user_id', userId).first();

        if (!subscription) {
            return false;
        }

        await subscription.delete();
        return true;
    }

    /**
     * Get all active subscriptions for a user
     */
    public async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
        return PushSubscription.query().where('user_id', userId).where('is_active', true);
    }

    /**
     * Send push notification to user
     */
    public async sendPushNotification(notification: Notification, userNotification: UserNotification): Promise<void> {
        if (!this.initialized) {
            logger.warn('WebPushService not initialized. Skipping push notification.');
            return;
        }

        try {
            const subscriptions = await this.getUserSubscriptions(userNotification.userId);

            if (subscriptions.length === 0) {
                logger.info({ userId: userNotification.userId }, 'No active push subscriptions found');
                return;
            }

            // Build notification payload
            const payload = JSON.stringify({
                title: notification.titleKey, // TODO: Translate using i18n
                body: notification.messageKey, // TODO: Translate using i18n
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                data: {
                    url: notification.actionUrl || '/',
                    notificationId: notification.id,
                    userNotificationId: userNotification.id,
                },
            });

            // Send to all user's devices
            const sendPromises = subscriptions.map((sub) => this.sendToDevice(sub, payload));

            await Promise.allSettled(sendPromises);
        } catch (error) {
            logger.error({ err: error, userNotificationId: userNotification.id }, 'Failed to send push notification');
            throw error;
        }
    }

    /**
     * Send push to a specific device
     */
    private async sendToDevice(subscription: PushSubscription, payload: string): Promise<void> {
        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.p256dhKey,
                        auth: subscription.authKey,
                    },
                },
                payload
            );

            // Update last used timestamp
            subscription.lastUsedAt = new Date() as any;
            await subscription.save();

            logger.info({ subscriptionId: subscription.id }, 'Push notification sent successfully');
        } catch (error: any) {
            logger.error({ err: error, subscriptionId: subscription.id }, 'Failed to send push to device');

            // Handle expired/invalid subscriptions (410 Gone)
            if (error.statusCode === 410) {
                logger.info({ subscriptionId: subscription.id }, 'Subscription expired, marking as inactive');
                subscription.isActive = false;
                await subscription.save();
            }

            throw error;
        }
    }

    /**
     * Process push notification job (called by pg-boss worker)
     */
    public async processPushJob(data: { notificationId: string; userNotificationId: string }): Promise<void> {
        try {
            const notification = await Notification.findOrFail(data.notificationId);
            const userNotification = await UserNotification.findOrFail(data.userNotificationId);

            await this.sendPushNotification(notification, userNotification);
        } catch (error) {
            logger.error({ err: error, jobData: data }, 'Failed to process push notification job');
            throw error;
        }
    }
}
