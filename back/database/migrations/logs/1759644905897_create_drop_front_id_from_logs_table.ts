import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected connection = 'logs';

    async up() {
        // Drop front_id from logs table
        this.schema.alterTable('logs', (table) => {
            table.dropColumn('front_id');
        });

        // Drop front_id from users table (in logs database)
        this.schema.alterTable('users', (table) => {
            table.dropColumn('front_id');
        });
    }

    async down() {
        // Re-add front_id to logs table
        this.schema.alterTable('logs', (table) => {
            table.specificType('front_id', 'serial').notNullable();
        });

        // Re-add front_id to users table (in logs database)
        this.schema.alterTable('users', (table) => {
            table.specificType('front_id', 'serial').notNullable();
        });
    }
}
