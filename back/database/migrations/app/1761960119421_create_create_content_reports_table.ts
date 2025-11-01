import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'content_reports';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'));

            // Reporter information
            table.uuid('reporter_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

            // Content being reported (polymorphic relationship)
            table.string('content_type').notNullable(); // 'comment' | 'proposition'
            table.uuid('content_id').notNullable();

            // Report details
            table.string('reason').notNullable(); // 'spam' | 'harassment' | 'inappropriate' | 'other'
            table.text('description').nullable();

            // Review status
            table.string('status').notNullable().defaultTo('pending'); // 'pending' | 'reviewed' | 'dismissed'
            table.uuid('reviewed_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
            table.timestamp('reviewed_at').nullable();
            table.text('review_notes').nullable();

            table.timestamp('created_at').notNullable().defaultTo(this.now());
            table.timestamp('updated_at').notNullable().defaultTo(this.now());

            // Indexes for performance
            table.index(['content_type', 'content_id'], 'idx_content_reports_content');
            table.index('status', 'idx_content_reports_status');
            table.index('reporter_user_id', 'idx_content_reports_reporter');
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
