import { BaseCommand } from '@adonisjs/core/ace';
import { Client } from 'pg';
import env from '#start/env';

export default class CreateNotifyTrigger extends BaseCommand {
    static commandName = 'create:notify:trigger';
    static description = 'Create the PostgreSQL NOTIFY trigger for user_notifications';

    async run() {
        this.logger.info('Creating notify_user_notification trigger...');

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

            // Create the function
            await client.query(`
                CREATE OR REPLACE FUNCTION notify_user_notification() RETURNS TRIGGER AS $$
                BEGIN
                  PERFORM pg_notify('user_notification', json_build_object(
                    'id', NEW.id,
                    'user_id', NEW.user_id,
                    'notification_id', NEW.notification_id,
                    'created_at', NEW.created_at
                  )::text);
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            this.logger.success('Function notify_user_notification created');

            // Drop and recreate the trigger
            await client.query('DROP TRIGGER IF EXISTS user_notification_trigger ON user_notifications');
            await client.query(`
                CREATE TRIGGER user_notification_trigger
                AFTER INSERT ON user_notifications
                FOR EACH ROW
                EXECUTE FUNCTION notify_user_notification();
            `);
            this.logger.success('Trigger user_notification_trigger created');

            // Verify
            const result = await client.query(`
                SELECT trigger_name, event_manipulation, action_statement
                FROM information_schema.triggers
                WHERE trigger_name = 'user_notification_trigger'
            `);

            if (result.rows && result.rows.length > 0) {
                this.logger.success('Trigger verified successfully:');
                this.logger.info(JSON.stringify(result.rows[0], null, 2));
            } else {
                this.logger.error('Trigger was not found after creation!');
            }
        } catch (error) {
            this.logger.error('Failed to create trigger:');
            this.logger.error(error.message);
            throw error;
        } finally {
            await client.end();
            this.logger.info('Database connection closed');
        }
    }
}
