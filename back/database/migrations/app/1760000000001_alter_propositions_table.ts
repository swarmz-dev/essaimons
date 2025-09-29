import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected propositionsTable: string = 'propositions';

    public async up(): Promise<void> {
        this.schema.alterTable(this.propositionsTable, (table: Knex.AlterTableBuilder): void => {
            table.string('status', 50).notNullable().defaultTo('draft');
            table.timestamp('status_started_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.string('visibility', 50).notNullable().defaultTo('private');
            table.timestamp('archived_at', { useTz: true }).nullable();
            table.jsonb('settings_snapshot').notNullable().defaultTo(this.raw("'{}'::jsonb"));

            table.index(['status']);
            table.index(['visibility']);
        });
    }

    public async down(): Promise<void> {
        this.schema.alterTable(this.propositionsTable, (table: Knex.AlterTableBuilder): void => {
            table.dropIndex(['status']);
            table.dropIndex(['visibility']);
            table.dropColumn('status');
            table.dropColumn('status_started_at');
            table.dropColumn('visibility');
            table.dropColumn('archived_at');
            table.dropColumn('settings_snapshot');
        });
    }
}
