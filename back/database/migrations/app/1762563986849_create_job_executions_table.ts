import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'job_executions';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery);
            table.string('job_type', 50).notNullable().index();
            table.string('status', 20).notNullable();
            table.timestamp('started_at', { useTz: true }).notNullable();
            table.timestamp('completed_at', { useTz: true }).nullable();
            table.integer('duration_ms').nullable();
            table.jsonb('metadata').nullable();
            table.text('error_message').nullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
