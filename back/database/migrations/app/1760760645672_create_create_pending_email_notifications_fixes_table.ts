import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'pending_email_notifications';

    async up() {
        // Force creation with IF NOT EXISTS via raw SQL
        await this.db.rawQuery(`
            CREATE TABLE IF NOT EXISTS pending_email_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
                sent BOOLEAN NOT NULL DEFAULT false,
                scheduled_for TIMESTAMP NOT NULL,
                sent_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
        `);

        // Create index if not exists
        await this.db.rawQuery(`
            CREATE INDEX IF NOT EXISTS idx_pending_email_notifications_user_sent_scheduled
            ON pending_email_notifications(user_id, sent, scheduled_for)
        `);
    }

    async down() {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            this.schema.dropTable(this.tableName);
        }
    }
}
