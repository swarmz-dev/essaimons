import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'deadline_reminders_sent';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);

            table.uuid('proposition_id').notNullable().references('id').inTable('propositions').onDelete('CASCADE');
            table.string('reminder_type', 50).notNullable(); // 'deadline_48h', 'deadline_24h_initiator', 'weekly_vote_digest', 'vote_quorum_warning'
            table.string('deadline_type', 50).notNullable(); // 'clarification', 'amendment', 'vote', 'mandate', 'evaluation'
            table.timestamp('deadline_at').notNullable(); // The actual deadline being reminded about
            table.timestamp('sent_at').notNullable(); // When the reminder was sent

            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();

            // Ensure we don't send the same reminder twice for the same deadline
            table.unique(['proposition_id', 'reminder_type', 'deadline_type', 'deadline_at']);
            table.index(['proposition_id', 'reminder_type']);
            table.index(['sent_at']);
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
