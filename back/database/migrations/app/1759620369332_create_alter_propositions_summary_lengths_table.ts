import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'propositions';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('summary', 600).notNullable().alter();
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('summary', 300).notNullable().alter();
        });
    }
}
