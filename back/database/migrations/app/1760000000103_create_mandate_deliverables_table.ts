import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'mandate_deliverables';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable('proposition_mandates').onDelete('CASCADE');
            table.uuid('file_id').notNullable().references('id').inTable('files').onDelete('CASCADE');
            table.uuid('uploaded_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('label', 255);
            table.string('objective_ref', 255);
            table.string('auto_filename', 255);
            table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('evaluation_deadline_snapshot', { useTz: true }).nullable();
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
