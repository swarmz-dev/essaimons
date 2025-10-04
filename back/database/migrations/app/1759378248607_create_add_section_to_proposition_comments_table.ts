import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
    protected tableName = 'proposition_comments';

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('section', 100).nullable().after('scope');
        });
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('section');
        });
    }
}
