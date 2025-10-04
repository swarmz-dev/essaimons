import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_mandates';

    async up() {
        // Update all mandates with status 'draft' or 'pending' to 'to_assign'
        await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'to_assign' WHERE status IN ('draft', 'pending')`);
    }

    async down() {
        // In case of rollback, revert 'to_assign' back to 'pending'
        await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'pending' WHERE status = 'to_assign'`);
    }
}
