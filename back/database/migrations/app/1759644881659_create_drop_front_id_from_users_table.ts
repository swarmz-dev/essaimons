import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'users';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('front_id');
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.specificType('front_id', 'serial').notNullable();
        });
    }
}
