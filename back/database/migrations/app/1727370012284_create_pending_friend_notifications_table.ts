import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'pending_friend_notifications';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.specificType('front_id', 'serial').notNullable();
            table.uuid('from_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('for_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('pending_friend_id').notNullable().references('id').inTable('pending_friends').onDelete('CASCADE');
            table.boolean('seen').notNullable().defaultTo(false);
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
