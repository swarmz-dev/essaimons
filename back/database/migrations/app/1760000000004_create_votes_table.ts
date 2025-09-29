import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected votesTable: string = 'proposition_votes';

    public async up(): Promise<void> {
        this.schema.createTable(this.votesTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.string('phase', 50).notNullable();
            table.string('method', 50).notNullable();
            table.string('title', 255).notNullable();
            table.text('description');
            table.timestamp('open_at', { useTz: true }).nullable();
            table.timestamp('close_at', { useTz: true }).nullable();
            table.integer('max_selections').nullable();
            table.string('status', 50).notNullable().defaultTo('draft');
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.votesTable);
    }
}
