import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'notification_settings';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));

            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

            // Notification type (status_transition, mandate_assigned, deliverable_uploaded, etc.)
            table.string('notification_type', 100).notNullable();

            // Channel preferences
            table.boolean('in_app_enabled').defaultTo(true).notNullable();
            table.boolean('email_enabled').defaultTo(true).notNullable();
            table.boolean('push_enabled').defaultTo(true).notNullable();

            // Additional settings per notification type (e.g., digest frequency, quiet hours)
            table.jsonb('settings').nullable();

            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            // Each user can have one settings record per notification type
            table.unique(['user_id', 'notification_type']);
            table.index(['user_id']);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
