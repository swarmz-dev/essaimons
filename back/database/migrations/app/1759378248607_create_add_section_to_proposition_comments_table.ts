import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_comments';

    async up() {
        // Check if table exists before trying to alter it
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            const hasSection = await this.schema.hasColumn(this.tableName, 'section');

            if (!hasSection) {
                this.schema.alterTable(this.tableName, (table) => {
                    table.string('section', 100).nullable();
                });
            }
        }
        // If table doesn't exist yet, skip - it will be created by another migration
    }

    async down() {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            const hasSection = await this.schema.hasColumn(this.tableName, 'section');

            if (hasSection) {
                this.schema.alterTable(this.tableName, (table) => {
                    table.dropColumn('section');
                });
            }
        }
    }
}
