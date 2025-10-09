import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'proposition_comments';

    public async up(): Promise<void> {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (!hasTable) {
            this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
                table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
                table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
                table.uuid('author_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
                table.text('content').notNullable();
                table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
                table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
            });
        }
    }

    public async down(): Promise<void> {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            this.schema.dropTable(this.tableName);
        }
    }
}
