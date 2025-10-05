import { BaseCommand } from '@adonisjs/core/ace';
import { Client } from 'pg';
import env from '#start/env';

export default class TestNotify extends BaseCommand {
    static commandName = 'test:notify';
    static description = 'Test PostgreSQL NOTIFY by manually sending a notification';

    async run() {
        this.logger.info('Testing PostgreSQL NOTIFY...');

        const client = new Client({
            host: env.get('DB_HOST'),
            port: env.get('DB_PORT'),
            database: env.get('DB_DATABASE'),
            user: env.get('DB_USER'),
            password: env.get('DB_PASSWORD'),
        });

        try {
            await client.connect();
            this.logger.info('Connected to database');

            // Send a test notification
            const testPayload = {
                id: 'test-id-123',
                user_id: 'test-user-456',
                notification_id: 'test-notif-789',
                created_at: new Date().toISOString(),
            };

            await client.query(`SELECT pg_notify('user_notification', $1)`, [JSON.stringify(testPayload)]);

            this.logger.success('Test NOTIFY sent on channel "user_notification"');
            this.logger.info('Payload: ' + JSON.stringify(testPayload));
            this.logger.info('Check your backend server logs for the notification receipt');

            // Wait a bit to allow time for the listener to receive it
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            this.logger.error('Failed to send test notification:');
            this.logger.error(error.message);
            throw error;
        } finally {
            await client.end();
            this.logger.info('Database connection closed');
        }
    }
}
