import { BaseSchema } from '@adonisjs/lucid/schema';
import { Knex } from 'knex';

export default class extends BaseSchema {
    protected propositionsTable: string = 'propositions';
    protected statusHistoryTable: string = 'proposition_status_histories';
    protected eventsTable: string = 'proposition_events';
    protected votesTable: string = 'proposition_votes';
    protected voteOptionsTable: string = 'vote_options';
    protected voteBallotsTable: string = 'vote_ballots';
    protected mandatesTable: string = 'proposition_mandates';
    protected mandateApplicationsTable: string = 'mandate_applications';
    protected mandateDeliverablesTable: string = 'mandate_deliverables';
    protected deliverableEvaluationsTable: string = 'deliverable_evaluations';
    protected revocationRequestsTable: string = 'mandate_revocation_requests';
    protected commentsTable: string = 'proposition_comments';
    protected reactionsTable: string = 'proposition_reactions';

    public async up(): Promise<void> {
        this.schema.alterTable(this.propositionsTable, (table: Knex.AlterTableBuilder): void => {
            table.string('status', 50).notNullable().defaultTo('draft');
            table.timestamp('status_started_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.string('visibility', 50).notNullable().defaultTo('private');
            table.timestamp('archived_at', { useTz: true }).nullable();
            table.jsonb('settings_snapshot').notNullable().defaultTo(this.raw("'{}'::jsonb"));

            table.index(['status']);
            table.index(['visibility']);
        });

        this.schema.createTable(this.statusHistoryTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.string('from_status', 50).notNullable();
            table.string('to_status', 50).notNullable();
            table.uuid('triggered_by_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.text('reason');
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.eventsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.string('type', 50).notNullable();
            table.string('title', 255).notNullable();
            table.text('description');
            table.timestamp('start_at', { useTz: true }).nullable();
            table.timestamp('end_at', { useTz: true }).nullable();
            table.string('location', 255);
            table.string('video_link', 255);
            table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.votesTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.string('phase', 50).notNullable();
            table.string('method', 50).notNullable();
            table.string('title', 255).notNullable();
            table.text('description');
            table.timestamp('open_at', { useTz: true }).nullable();
            table.timestamp('close_at', { useTz: true }).nullable();
            table.integer('max_selections').nullable();
            table.string('status', 50).notNullable().defaultTo('draft');
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.voteOptionsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('vote_id').notNullable().references('id').inTable(this.votesTable).onDelete('CASCADE');
            table.string('label', 255).notNullable();
            table.text('description');
            table.integer('position').notNullable().defaultTo(0);
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.voteBallotsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('vote_id').notNullable().references('id').inTable(this.votesTable).onDelete('CASCADE');
            table.uuid('voter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.jsonb('payload').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('revoked_at', { useTz: true }).nullable();

            table.unique(['vote_id', 'voter_id']);
        });

        this.schema.createTable(this.mandatesTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.string('title', 255).notNullable();
            table.text('description');
            table.uuid('holder_user_id').references('id').inTable('users').onDelete('SET NULL');
            table.string('status', 50).notNullable().defaultTo('draft');
            table.string('target_objective_ref', 255);
            table.timestamp('initial_deadline', { useTz: true }).nullable();
            table.timestamp('current_deadline', { useTz: true }).nullable();
            table.timestamp('last_status_update_at', { useTz: true }).nullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.mandateApplicationsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable(this.mandatesTable).onDelete('CASCADE');
            table.uuid('applicant_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('statement');
            table.string('status', 50).notNullable().defaultTo('pending');
            table.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            table.unique(['mandate_id', 'applicant_user_id']);
        });

        this.schema.createTable(this.mandateDeliverablesTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable(this.mandatesTable).onDelete('CASCADE');
            table.uuid('file_id').notNullable().references('id').inTable('files').onDelete('CASCADE');
            table.uuid('uploaded_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('label', 255);
            table.string('objective_ref', 255);
            table.string('auto_filename', 255);
            table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('evaluation_deadline_snapshot', { useTz: true }).nullable();
            table.jsonb('metadata').notNullable().defaultTo(this.raw("'{}'::jsonb"));
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.deliverableEvaluationsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('deliverable_id').notNullable().references('id').inTable(this.mandateDeliverablesTable).onDelete('CASCADE');
            table.uuid('evaluator_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('verdict', 50).notNullable();
            table.text('comment');
            table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());

            table.unique(['deliverable_id', 'evaluator_user_id']);
        });

        this.schema.createTable(this.revocationRequestsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('mandate_id').notNullable().references('id').inTable(this.mandatesTable).onDelete('CASCADE');
            table.uuid('initiated_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('reason');
            table.string('status', 50).notNullable().defaultTo('pending');
            table.uuid('vote_id').references('id').inTable(this.votesTable).onDelete('SET NULL');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('resolved_at', { useTz: true }).nullable();
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.commentsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('parent_id').references('id').inTable(this.commentsTable).onDelete('CASCADE');
            table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('scope', 50).notNullable();
            table.string('visibility', 50).notNullable().defaultTo('public');
            table.text('content').notNullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now());
        });

        this.schema.createTable(this.reactionsTable, (table: Knex.CreateTableBuilder): void => {
            table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v4()'));
            table.uuid('proposition_id').notNullable().references('id').inTable(this.propositionsTable).onDelete('CASCADE');
            table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('type', 50).notNullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now());

            table.unique(['proposition_id', 'author_id', 'type']);
        });
    }

    public async down(): Promise<void> {
        this.schema.dropTable(this.reactionsTable);
        this.schema.dropTable(this.commentsTable);
        this.schema.dropTable(this.revocationRequestsTable);
        this.schema.dropTable(this.deliverableEvaluationsTable);
        this.schema.dropTable(this.mandateDeliverablesTable);
        this.schema.dropTable(this.mandateApplicationsTable);
        this.schema.dropTable(this.mandatesTable);
        this.schema.dropTable(this.voteBallotsTable);
        this.schema.dropTable(this.voteOptionsTable);
        this.schema.dropTable(this.votesTable);
        this.schema.dropTable(this.eventsTable);
        this.schema.dropTable(this.statusHistoryTable);

        this.schema.alterTable(this.propositionsTable, (table: Knex.AlterTableBuilder): void => {
            table.dropIndex(['status']);
            table.dropIndex(['visibility']);
            table.dropColumn('status');
            table.dropColumn('status_started_at');
            table.dropColumn('visibility');
            table.dropColumn('archived_at');
            table.dropColumn('settings_snapshot');
        });
    }
}
