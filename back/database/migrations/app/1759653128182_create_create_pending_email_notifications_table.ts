import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'pending_email_notifications';

    async up() {
        // Check if notifications table exists before creating this table
        const hasNotificationsTable = await this.schema.hasTable('notifications');
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasNotificationsTable && !hasTable) {
            this.schema.createTable(this.tableName, (table) => {
                table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'));

                table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.uuid('notification_id').notNullable().references('id').inTable('notifications').onDelete('CASCADE');

                table.boolean('sent').defaultTo(false).notNullable();
                table.timestamp('scheduled_for').notNullable(); // When this email should be sent
                table.timestamp('sent_at').nullable();

                table.timestamp('created_at').notNullable();
                table.timestamp('updated_at').notNullable();

                table.index(['user_id', 'sent', 'scheduled_for']);
            });
        }
        // If notifications table doesn't exist yet, skip - this table will be created later
    }

    async down() {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            this.schema.dropTable(this.tableName);
        }
    }
}
