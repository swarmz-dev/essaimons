import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected mandatesTable: string = 'proposition_mandates';
    protected deliverablesTable: string = 'mandate_deliverables';

    public async up(): Promise<void> {
        this.schema.alterTable(this.mandatesTable, (table: Knex.AlterTableBuilder): void => {
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('last_automation_run_at', { useTz: true }).nullable();
        });

        this.schema.alterTable(this.deliverablesTable, (table: Knex.AlterTableBuilder): void => {
            table.string('status', 50).notNullable().defaultTo('pending');
            table.timestamp('non_conformity_flagged_at', { useTz: true }).nullable();
        });
    }

    public async down(): Promise<void> {
        this.schema.alterTable(this.deliverablesTable, (table: Knex.AlterTableBuilder): void => {
            table.dropColumn('non_conformity_flagged_at');
            table.dropColumn('status');
        });

        this.schema.alterTable(this.mandatesTable, (table: Knex.AlterTableBuilder): void => {
            table.dropColumn('last_automation_run_at');
            table.dropColumn('metadata');
        });
    }
}
