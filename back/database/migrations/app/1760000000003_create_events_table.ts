import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected eventsTable: string = 'proposition_events';

    public async up(): Promise<void> {
        this.schema.createTable(this.eventsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.string('type', 50).notNullable();
            table.string('title', 255).notNullable();
            table.text('description');
            table.timestamp('start_at', { useTz: true }).nullable();
            table.timestamp('end_at', { useTz: true }).nullable();
            table.string('location', 255);
            table.string('video_link', 255);
            table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.eventsTable);
    }
}
