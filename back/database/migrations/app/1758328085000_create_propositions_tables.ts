import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected propositionsTable: string = 'propositions';
    protected categoriesTable: string = 'proposition_categories';
    protected categoryPivotTable: string = 'proposition_category_pivot';
    protected rescueInitiatorsTable: string = 'proposition_rescue_initiators';
    protected attachmentsTable: string = 'proposition_attachments';
    protected associationsTable: string = 'proposition_associations';

    public async up(): Promise<void> {
        this.schema.createTable(this.categoriesTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.string('name', 255).notNullable().unique();
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });

        this.schema.createTable(this.propositionsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.string('title', 150).notNullable();
            table.string('summary', 300).notNullable();
            table.text('detailed_description').notNullable();
            table.text('smart_objectives').notNullable();
            table.text('impacts').notNullable();
            table.text('mandates_description').notNullable();
            table.string('expertise', 150);
            table.date('clarification_deadline').notNullable();
            table.date('improvement_deadline').notNullable();
            table.date('vote_deadline').notNullable();
            table.date('mandate_deadline').notNullable();
            table.date('evaluation_deadline').notNullable();
            table.uuid('creator_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('visual_file_id').references('id').inTable('files').onDelete('SET NULL');
            table.timestamp('created_at', { useTz: true });
            table.timestamp('updated_at', { useTz: true });
        });

        this.schema.createTable(this.categoryPivotTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('category_id').notNullable().references('id').inTable(this.categoriesTable).onDelete('CASCADE');
            table.primary(['proposition_id', 'category_id']);
        });

        this.schema.createTable(this.rescueInitiatorsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.primary(['proposition_id', 'user_id']);
        });

        this.schema.createTable(this.attachmentsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('file_id').notNullable().references('id').inTable('files').onDelete('CASCADE');
            table.primary(['proposition_id', 'file_id']);
        });

        this.schema.createTable(this.associationsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('related_proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.primary(['proposition_id', 'related_proposition_id']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.associationsTable);
        this.schema.dropTable(this.attachmentsTable);
        this.schema.dropTable(this.rescueInitiatorsTable);
        this.schema.dropTable(this.categoryPivotTable);
        this.schema.dropTable(this.propositionsTable);
        this.schema.dropTable(this.categoriesTable);
    }
}
