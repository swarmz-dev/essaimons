import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'proposition_mandates';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.string('title', 255).notNullable();
            table.text('description');
            table.uuid('holder_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.string('status', 50).notNullable().defaultTo('draft');
            table.string('target_objective_ref', 255);
            table.timestamp('initial_deadline', { useTz: true }).nullable();
            table.timestamp('current_deadline', { useTz: true }).nullable();
            table.timestamp('last_status_update_at', { useTz: true }).nullable();
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
