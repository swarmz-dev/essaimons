import { BaseCommand } from '@adonisjs/core/ace';
import { CommandOptions } from '@adonisjs/core/types/ace';
import db from '@adonisjs/lucid/services/db';

export default class VerifySeed extends BaseCommand {
    static commandName = 'verify:seed';
    static description = 'Verify seed data';

    static options: CommandOptions = {
        startApp: true,
    };

    async run() {
        this.logger.info('📊 Vérification des données du seeder\n');

        // Propositions par statut
        const propsByStatus = await db.from('propositions').groupBy('status').select('status').count('* as count');
        this.logger.info('🗳️  Propositions par statut:');
        propsByStatus.forEach((row: { status: string; count: number }) => {
            this.logger.info(`   - ${row.status}: ${row.count}`);
        });

        // Commentaires par scope
        const commentsByScope = await db.from('proposition_comments').groupBy('scope').select('scope').count('* as count');
        this.logger.info('\n💬 Commentaires par scope:');
        commentsByScope.forEach((row: { scope: string; count: number }) => {
            this.logger.info(`   - ${row.scope}: ${row.count}`);
        });

        // Événements par type
        const eventsByType = await db.from('proposition_events').groupBy('type').select('type').count('* as count');
        this.logger.info('\n📅 Événements par type:');
        eventsByType.forEach((row: { type: string; count: number }) => {
            this.logger.info(`   - ${row.type}: ${row.count}`);
        });

        // Mandats par statut
        const mandatesByStatus = await db.from('proposition_mandates').groupBy('status').select('status').count('* as count');
        this.logger.info('\n📋 Mandats par statut:');
        mandatesByStatus.forEach((row: { status: string; count: number }) => {
            this.logger.info(`   - ${row.status}: ${row.count}`);
        });

        // Candidatures par statut
        const applicationsByStatus = await db.from('mandate_applications').groupBy('status').select('status').count('* as count');
        this.logger.info('\n✋ Candidatures par statut:');
        applicationsByStatus.forEach((row: { status: string; count: number }) => {
            this.logger.info(`   - ${row.status}: ${row.count}`);
        });

        // Votes
        const votesCount = await db.from('proposition_votes').count('* as count').first();
        this.logger.info(`\n🗳️  Votes configurés: ${votesCount?.count || 0}`);

        // Historique de statut
        const historyCount = await db.from('proposition_status_histories').count('* as count').first();
        this.logger.info(`\n📜 Entrées d'historique de statut: ${historyCount?.count || 0}`);

        this.logger.success('\n✅ Vérification terminée !');
    }
}
