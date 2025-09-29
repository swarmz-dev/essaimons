import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'mandate_deliverables';

    public async up(): Promise<void> {
        this.schema.alterTable(this.tableName, (table: Knex.AlterTableBuilder): void => {
            table.string('status', 50).notNullable().defaultTo('pending');
            table.timestamp('non_conformity_flagged_at', { useTz: true }).nullable();
        });
    }

    public async down(): Promise<void> {
        this.schema.alterTable(this.tableName, (table: Knex.AlterTableBuilder): void => {
            table.dropColumn('status');
            table.dropColumn('non_conformity_flagged_at');
        });
    }
}
