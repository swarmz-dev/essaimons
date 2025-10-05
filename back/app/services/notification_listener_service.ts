import transmit from '@adonisjs/transmit/services/main';
import logger from '@adonisjs/core/services/logger';
import UserNotification from '#models/user_notification';
import { Client } from 'pg';
import env from '#start/env';

export default class NotificationListenerService {
    private client: Client | null = null;
    private isListening: boolean = false;
    private healthCheckInterval: NodeJS.Timeout | null = null;

    /**
     * Start listening to Postgres NOTIFY events
     */
    public async start(): Promise<void> {
        if (this.isListening) {
            logger.warn('NotificationListenerService is already listening');
            return;
        }

        try {
            // Create a native pg client for LISTEN/NOTIFY using env variables
            this.client = new Client({
                host: env.get('DB_HOST'),
                port: env.get('DB_PORT'),
                database: env.get('DB_DATABASE'),
                user: env.get('DB_USER'),
                password: env.get('DB_PASSWORD'),
                // Keep connection alive for LISTEN/NOTIFY
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
            });

            await this.client.connect();
            logger.info('PostgreSQL client connected successfully');

            // Test the connection
            const testResult = await this.client.query('SELECT NOW()');
            logger.info({ serverTime: testResult.rows[0].now }, 'Connection test successful');

            // Listen to user_notification channel
            await this.client.query('LISTEN user_notification');
            logger.info('Successfully executed LISTEN user_notification');

            // Verify we are listening
            const channels = await this.client.query(`
                SELECT * FROM pg_listening_channels()
                WHERE pg_listening_channels = 'user_notification'
            `);
            logger.info({ channelCount: channels.rows.length }, 'Listening channels verified');

            // Handle notifications - register handler BEFORE confirming listener is ready
            logger.info('Registering notification event handler...');

            // IMPORTANT: The 'notification' event won't fire unless we have something keeping the event loop active
            // We need to ensure the client connection is actively processing messages
            const notificationHandler = async (msg: any) => {
                logger.info({ channel: msg.channel, payload: msg.payload, timestamp: new Date().toISOString() }, 'Received notification event from PostgreSQL');
                if (msg.channel === 'user_notification') {
                    await this.handleNotification(msg.payload);
                } else {
                    logger.warn({ channel: msg.channel }, 'Received notification on unexpected channel');
                }
            };

            this.client.on('notification', notificationHandler);

            // Test that the event emitter works by checking listener count
            const listenerCount = this.client.listenerCount('notification');
            logger.info({ listenerCount }, 'Notification event handler registered');

            // Also log all events to debug
            this.client.on('error', (err) => {
                logger.error({ err }, 'PG Client error event - attempting reconnect');
                this.reconnect();
            });
            this.client.on('end', () => {
                logger.warn('PG Client end event - attempting reconnect');
                this.reconnect();
            });
            this.client.on('notice', (notice) => {
                logger.debug({ notice }, 'PG Client notice event');
            });

            this.isListening = true;
            logger.info('NotificationListenerService started listening to Postgres NOTIFY');

            // Start health check to ensure connection stays alive
            this.startHealthCheck();
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
            // Stop health check
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }

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
        logger.info({ rawPayload: payload }, 'handleNotification called with payload');
        try {
            const data = JSON.parse(payload);

            logger.info({ notificationData: data }, 'Received notification from Postgres NOTIFY - successfully parsed JSON');

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
                    messageKey: userNotification.notification.bodyKey,
                    data: userNotification.notification.interpolationData,
                    actionUrl: userNotification.notification.actionUrl,
                    isRead: userNotification.read,
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

    /**
     * Start periodic health checks to keep connection alive
     */
    private startHealthCheck(): void {
        // Check every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            if (this.client && this.isListening) {
                try {
                    await this.client.query('SELECT 1');
                    logger.debug('NotificationListener health check: Connection alive');
                } catch (error) {
                    logger.error({ err: error }, 'NotificationListener health check failed');
                    this.reconnect();
                }
            }
        }, 30000);
    }
}
