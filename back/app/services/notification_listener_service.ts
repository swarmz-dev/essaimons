import db from '@adonisjs/lucid/services/db';
import transmit from '@adonisjs/transmit/services/main';
import logger from '@adonisjs/core/services/logger';
import UserNotification from '#models/user_notification';

export default class NotificationListenerService {
    private client: any = null;
    private isListening: boolean = false;

    /**
     * Start listening to Postgres NOTIFY events
     */
    public async start(): Promise<void> {
        if (this.isListening) {
            logger.warn('NotificationListenerService is already listening');
            return;
        }

        try {
            // Get a dedicated client for listening
            this.client = await db.connection().getReadClient();

            // Listen to user_notification channel
            await this.client.query('LISTEN user_notification');

            // Handle notifications
            this.client.on('notification', async (msg: any) => {
                if (msg.channel === 'user_notification') {
                    await this.handleNotification(msg.payload);
                }
            });

            // Handle client errors
            this.client.on('error', (error: Error) => {
                logger.error({ err: error }, 'Postgres LISTEN client error');
                this.reconnect();
            });

            // Handle client end
            this.client.on('end', () => {
                logger.warn('Postgres LISTEN client connection ended');
                this.reconnect();
            });

            this.isListening = true;
            logger.info('NotificationListenerService started listening to Postgres NOTIFY');
        } catch (error) {
            logger.error({ err: error }, 'Failed to start NotificationListenerService');
            throw error;
        }
    }

    /**
     * Stop listening to Postgres NOTIFY events
     */
    public async stop(): Promise<void> {
        if (!this.isListening) {
            return;
        }

        try {
            if (this.client) {
                await this.client.query('UNLISTEN user_notification');
                this.client.removeAllListeners();
                await this.client.end();
                this.client = null;
            }

            this.isListening = false;
            logger.info('NotificationListenerService stopped');
        } catch (error) {
            logger.error({ err: error }, 'Failed to stop NotificationListenerService');
        }
    }

    /**
     * Reconnect to Postgres LISTEN
     */
    private async reconnect(): Promise<void> {
        logger.info('Reconnecting NotificationListenerService...');

        this.isListening = false;

        // Wait a bit before reconnecting
        await new Promise((resolve) => setTimeout(resolve, 5000));

        try {
            await this.start();
        } catch (error) {
            logger.error({ err: error }, 'Failed to reconnect NotificationListenerService');
            // Try again after another delay
            setTimeout(() => this.reconnect(), 10000);
        }
    }

    /**
     * Handle a notification event from Postgres
     */
    private async handleNotification(payload: string): Promise<void> {
        try {
            const data = JSON.parse(payload);

            logger.debug({ notificationData: data }, 'Received notification from Postgres NOTIFY');

            // Load the full user notification with relations
            const userNotification = await UserNotification.query().where('id', data.id).preload('notification').preload('user').firstOrFail();

            // Broadcast to user's SSE stream
            const streamName = `user/${data.user_id}/notifications`;

            await transmit.broadcast(streamName, {
                type: 'notification',
                data: {
                    id: userNotification.id,
                    notificationId: userNotification.notificationId,
                    type: userNotification.notification.type,
                    titleKey: userNotification.notification.titleKey,
                    messageKey: userNotification.notification.messageKey,
                    data: userNotification.notification.data,
                    actionUrl: userNotification.notification.actionUrl,
                    isRead: userNotification.isRead,
                    createdAt: userNotification.createdAt.toISO(),
                },
            });

            logger.info(
                {
                    userId: data.user_id,
                    notificationId: data.notification_id,
                    streamName,
                },
                'Notification broadcast to SSE stream'
            );
        } catch (error) {
            logger.error({ err: error, payload }, 'Failed to handle notification event');
        }
    }

    /**
     * Get the listening status
     */
    public isActive(): boolean {
        return this.isListening;
    }
}
