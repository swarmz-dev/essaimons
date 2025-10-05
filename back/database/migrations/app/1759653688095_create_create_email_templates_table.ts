import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'email_templates';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'));

            table.string('key').notNullable().unique(); // e.g., 'notification_single', 'notification_digest'
            table.string('name').notNullable(); // Human-readable name
            table.text('description').nullable();
            table.string('subject').notNullable();
            table.text('html_content').notNullable();
            table.text('text_content').nullable(); // Plain text fallback
            table.boolean('is_active').defaultTo(true).notNullable();

            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
