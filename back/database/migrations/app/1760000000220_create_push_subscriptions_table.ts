import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'push_subscriptions';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));

            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

            // Web Push subscription details (from PushSubscription object)
            table.string('endpoint', 1000).notNullable();
            table.text('p256dh_key').notNullable(); // Public key for encryption
            table.text('auth_key').notNullable(); // Authentication secret

            // Device/browser information
            table.string('user_agent', 500).nullable();
            table.string('device_name', 200).nullable();

            // Status
            table.boolean('active').defaultTo(true).notNullable();
            table.timestamp('last_used_at', { useTz: true }).nullable();

            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            // Indexes
            table.index(['user_id', 'active']);
            table.unique(['endpoint']); // Each subscription endpoint is unique
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
