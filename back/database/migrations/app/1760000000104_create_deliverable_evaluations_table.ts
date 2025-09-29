import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'deliverable_evaluations';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('deliverable_id').notNullable().references('id').inTable('mandate_deliverables').onDelete('CASCADE');
            table.uuid('evaluator_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('verdict', 50).notNullable();
            table.text('comment');
            table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            table.unique(['deliverable_id', 'evaluator_user_id']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
