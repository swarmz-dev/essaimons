import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'propositions';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.renameColumn('improvement_deadline', 'amendment_deadline');
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.renameColumn('amendment_deadline', 'improvement_deadline');
        });
    }
}
