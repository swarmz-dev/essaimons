import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'users';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('email_frequency', 20).defaultTo('daily').notNullable();
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('email_frequency');
        });
    }
}
