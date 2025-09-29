import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'mandate_applications';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable('proposition_mandates').onDelete('CASCADE');
            table.uuid('applicant_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('statement');
            table.string('status', 50).notNullable().defaultTo('pending');
            table.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });

            table.unique(['mandate_id', 'applicant_user_id']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
