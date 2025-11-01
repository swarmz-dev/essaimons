import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    async up() {
        // Add hidden fields to propositions table
        this.schema.alterTable('propositions', (table) => {
            table.boolean('is_hidden').defaultTo(false).notNullable();
            table.timestamp('hidden_at').nullable();
            table.uuid('hidden_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        });

        // Add hidden fields to proposition_comments table
        this.schema.alterTable('proposition_comments', (table) => {
            table.boolean('is_hidden').defaultTo(false).notNullable();
            table.timestamp('hidden_at').nullable();
            table.uuid('hidden_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        });
    }

    async down() {
        this.schema.alterTable('propositions', (table) => {
            table.dropColumn('is_hidden');
            table.dropColumn('hidden_at');
            table.dropColumn('hidden_by_user_id');
        });

        this.schema.alterTable('proposition_comments', (table) => {
            table.dropColumn('is_hidden');
            table.dropColumn('hidden_at');
            table.dropColumn('hidden_by_user_id');
        });
    }
}
