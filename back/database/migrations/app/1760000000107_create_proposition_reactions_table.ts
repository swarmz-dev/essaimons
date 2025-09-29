import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected tableName: string = 'proposition_reactions';

    public async up(): Promise<void> {
        this.schema.createTable(this.tableName, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('reaction_type', 50).notNullable();
            table.timestamp('created_at', { useTz: true });

            table.unique(['proposition_id', 'user_id', 'reaction_type']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.tableName);
    }
}
