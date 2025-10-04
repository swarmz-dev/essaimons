import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'discord_settings';

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').primary();

            table.boolean('enabled').defaultTo(false).notNullable();
            table.string('bot_token', 255).nullable();
            table.string('guild_id', 255).nullable();
            table.string('default_channel_id', 255).nullable();

            table.timestamp('created_at').notNullable();
            table.timestamp('updated_at').notNullable();
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
