import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'proposition_mandates';

    public async up(): Promise<void> {
        this.schema.alterTable(this.tableName, (table: Knex.AlterTableBuilder): void => {
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('last_automation_run_at', { useTz: true }).nullable();
        });
    }

    public async down(): Promise<void> {
        this.schema.alterTable(this.tableName, (table: Knex.AlterTableBuilder): void => {
            table.dropColumn('metadata');
            table.dropColumn('last_automation_run_at');
        });
    }
}
