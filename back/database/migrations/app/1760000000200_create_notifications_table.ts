import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'notifications';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));

            // Type of notification (status_transition, mandate_assigned, deliverable_uploaded, etc.)
            table.string('type', 100).notNullable().index();

            // Related entities (all UUIDs in this schema)
            table.uuid('proposition_id').nullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.uuid('mandate_id').nullable().references('id').inTable('proposition_mandates').onDelete('CASCADE');
            table.uuid('deliverable_id').nullable().references('id').inTable('mandate_deliverables').onDelete('CASCADE');
            table.uuid('vote_id').nullable().references('id').inTable('proposition_votes').onDelete('CASCADE');

            // Notification content
            table.string('title_key', 200).notNullable(); // i18n key for title
            table.string('body_key', 200).notNullable(); // i18n key for body
            table.jsonb('interpolation_data').nullable(); // Data for i18n interpolation

            // Optional action URL
            table.string('action_url', 500).nullable();

            // Priority level (low, normal, high, urgent)
            table.string('priority', 20).defaultTo('normal');

            // Metadata for extensibility
            table.jsonb('metadata').nullable();

            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
