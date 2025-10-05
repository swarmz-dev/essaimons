import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_comments';

    async up() {
        // Check if table exists, if not create it with all columns
        const hasTable = await this.schema.hasTable(this.tableName);

        if (!hasTable) {
            this.schema.createTable(this.tableName, (table) => {
                table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
                table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
                table.uuid('parent_id').nullable().references('id').inTable('proposition_comments').onDelete('CASCADE');
                table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.string('scope', 50).notNullable();
                table.string('section', 100).nullable();
                table.string('visibility', 50).notNullable();
                table.text('content').notNullable();
                table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
                table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
            });
        } else {
            // If table exists, ensure all columns are present
            const hasParentId = await this.schema.hasColumn(this.tableName, 'parent_id');
            const hasScope = await this.schema.hasColumn(this.tableName, 'scope');
            const hasSection = await this.schema.hasColumn(this.tableName, 'section');
            const hasVisibility = await this.schema.hasColumn(this.tableName, 'visibility');

            this.schema.alterTable(this.tableName, (table) => {
                // Check and add missing columns
                if (!hasParentId) {
                    table.uuid('parent_id').nullable().references('id').inTable('proposition_comments').onDelete('CASCADE');
                }
                if (!hasScope) {
                    table.string('scope', 50).notNullable().defaultTo('clarification');
                }
                if (!hasSection) {
                    table.string('section', 100).nullable();
                }
                if (!hasVisibility) {
                    table.string('visibility', 50).notNullable().defaultTo('public');
                }
            });

            // Rename author_user_id to author_id if it exists
            const hasAuthorUserId = await this.schema.hasColumn(this.tableName, 'author_user_id');
            const hasAuthorId = await this.schema.hasColumn(this.tableName, 'author_id');

            if (hasAuthorUserId && !hasAuthorId) {
                this.schema.alterTable(this.tableName, (table) => {
                    table.renameColumn('author_user_id', 'author_id');
                });
            }
        }
    }

    async down() {
        // This migration is idempotent and fixes the schema
        // We don't want to drop the table or remove columns
    }
}
