import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected voteBallotsTable: string = 'vote_ballots';

    public async up(): Promise<void> {
        this.schema.createTable(this.voteBallotsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('vote_id').notNullable().references('id').inTable('proposition_votes').onDelete('CASCADE');
            table.uuid('voter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.jsonb('payload').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('revoked_at', { useTz: true }).nullable();
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });

            table.unique(['vote_id', 'voter_id']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.voteBallotsTable);
    }
}
