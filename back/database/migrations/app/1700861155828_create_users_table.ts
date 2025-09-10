import { Knex } from 'knex';
import { BaseSchema } from '@adonisjs/lucid/schema';
import UserRoleEnum from '#types/enum/user_role_enum';

export default class extends BaseSchema {
    protected tableName: string = 'users';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.specificType('front_id', 'serial').notNullable();
            table.string('username', 50).notNullable();
            table.string('email', 100).notNullable().unique();
            table.string('password').nullable();
            table.string('role').notNullable().defaultTo(UserRoleEnum.USER);
            table.boolean('enabled').defaultTo(false);
            table.boolean('accepted_terms_and_conditions').defaultTo(false);
            table.boolean('is_oauth').defaultTo(false);
            table.uuid('profile_picture_id').nullable().references('id').inTable('files');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
