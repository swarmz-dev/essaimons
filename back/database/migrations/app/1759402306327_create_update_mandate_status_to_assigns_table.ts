import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_mandates';

    async up() {
        // Mettre à jour tous les mandats avec status 'draft' ou 'pending' vers 'to_assign'
        await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'to_assign' WHERE status IN ('draft', 'pending')`);
    }

    async down() {
        // En cas de rollback, remettre 'to_assign' à 'pending'
        await this.db.rawQuery(`UPDATE ${this.tableName} SET status = 'pending' WHERE status = 'to_assign'`);
    }
}
