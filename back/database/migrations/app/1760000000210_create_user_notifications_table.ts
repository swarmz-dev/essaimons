import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'user_notifications';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));

            // Fan-out: each notification can target multiple users
            table.uuid('notification_id').notNullable().references('id').inTable('notifications').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

            // Delivery status per channel
            table.boolean('read').defaultTo(false).notNullable();
            table.timestamp('read_at', { useTz: true }).nullable();

            table.boolean('in_app_sent').defaultTo(false);
            table.timestamp('in_app_sent_at', { useTz: true }).nullable();

            table.boolean('email_sent').defaultTo(false);
            table.timestamp('email_sent_at', { useTz: true }).nullable();
            table.string('email_error', 500).nullable();

            table.boolean('push_sent').defaultTo(false);
            table.timestamp('push_sent_at', { useTz: true }).nullable();
            table.string('push_error', 500).nullable();

            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            // Indexes for performance
            table.index(['user_id', 'read']);
            table.index(['notification_id']);
            table.index(['created_at']);
        });

        // Create Postgres NOTIFY trigger for real-time delivery via SSE
        await this.schema.raw(`
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

      CREATE TRIGGER user_notification_trigger
      AFTER INSERT ON user_notifications
      FOR EACH ROW
      EXECUTE FUNCTION notify_user_notification();
    `);
    }

    async down() {
        this.schema.raw('DROP TRIGGER IF EXISTS user_notification_trigger ON user_notifications');
        this.schema.raw('DROP FUNCTION IF EXISTS notify_user_notification');
        this.schema.dropTable(this.tableName);
    }
}
