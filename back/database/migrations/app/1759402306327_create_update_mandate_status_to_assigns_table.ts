import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_mandates';

    async up() {
        // Check if table exists before trying to update it
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            // Update all mandates with status 'draft' or 'pending' to 'to_assign'
            await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'to_assign' WHERE status IN ('draft', 'pending')`);
        }
        // If table doesn't exist yet, skip - it will be created by another migration
    }

    async down() {
        const hasTable = await this.schema.hasTable(this.tableName);

        if (hasTable) {
            // In case of rollback, revert 'to_assign' back to 'pending'
            await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'pending' WHERE status = 'to_assign'`);
        }
    }
}
