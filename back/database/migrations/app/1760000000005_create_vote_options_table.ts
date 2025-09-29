import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected voteOptionsTable: string = 'vote_options';

    public async up(): Promise<void> {
        this.schema.createTable(this.voteOptionsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('vote_id').notNullable().references('id').inTable('proposition_votes').onDelete('CASCADE');
            table.string('label', 255).notNullable();
            table.text('description');
            table.integer('position').notNullable().defaultTo(0);
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.voteOptionsTable);
    }
}
