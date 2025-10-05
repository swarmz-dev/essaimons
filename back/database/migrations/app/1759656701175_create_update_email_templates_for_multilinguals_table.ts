import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'email_templates';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            // Drop old single-language columns
            table.dropColumn('subject');
            table.dropColumn('html_content');
            table.dropColumn('text_content');

            // Add new multilingual JSON columns
            table.jsonb('subjects').notNullable().defaultTo('{}');
            table.jsonb('html_contents').notNullable().defaultTo('{}');
            table.jsonb('text_contents').nullable().defaultTo('{}');
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            // Restore old columns
            table.string('subject').notNullable();
            table.text('html_content').notNullable();
            table.text('text_content').nullable();

            // Drop multilingual columns
            table.dropColumn('subjects');
            table.dropColumn('html_contents');
            table.dropColumn('text_contents');
        });
    }
}
