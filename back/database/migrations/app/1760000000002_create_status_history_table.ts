import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected statusHistoryTable: string = 'proposition_status_histories';

    public async up(): Promise<void> {
        this.schema.createTable(this.statusHistoryTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.string('from_status', 50).notNullable();
            table.string('to_status', 50).notNullable();
            table.uuid('triggered_by_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.text('reason');
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.statusHistoryTable);
    }
}
