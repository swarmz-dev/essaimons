import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'mandate_revocation_requests';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable('proposition_mandates').onDelete('CASCADE');
            table.uuid('initiated_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('reason');
            table.string('status', 50).notNullable().defaultTo('pending');
            table.uuid('vote_id').references('id').inTable('proposition_votes').onDelete('SET NULL');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('resolved_at', { useTz: true }).nullable();
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
