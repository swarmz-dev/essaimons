import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'users';

    async up() {
        // Ensure all undefined profile_picture_id values are set to NULL
        await this.db.rawQuery(`UPDATE ${this.tableName} SET profile_picture_id = NULL WHERE profile_picture_id IS NULL`);
    }

    async down() {
        // No rollback needed
    }
}
