import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'users';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.enum('email_frequency', ['instant', 'hourly', 'daily', 'weekly']).defaultTo('daily').notNullable();
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('email_frequency');
        });
    }
}
