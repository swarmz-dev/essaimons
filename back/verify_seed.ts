import app from '@adonisjs/core/services/app';
import { DbQueryEventNode } from '@adonisjs/lucid/types/database';

await app.booted();

const db = await app.container.make('lucid.db');

// Désactiver les logs de requête pour une sortie plus propre
db.connection().on('query', (query: DbQueryEventNode) => {
    // Ne rien faire
});

console.log('📊 Vérification des données du seeder\n');

// Propositions par statut
const propsByStatus = await db.from('propositions').groupBy('status').select('status', db.raw('COUNT(*) as count'));
console.log('🗳️  Propositions par statut:');
propsByStatus.forEach((row: { status: string; count: number }) => {
    console.log(`   - ${row.status}: ${row.count}`);
});

// Commentaires par scope
const commentsByScope = await db.from('proposition_comments').groupBy('scope').select('scope', db.raw('COUNT(*) as count'));
console.log('\n💬 Commentaires par scope:');
commentsByScope.forEach((row: { scope: string; count: number }) => {
    console.log(`   - ${row.scope}: ${row.count}`);
});

// Événements par type
const eventsByType = await db.from('proposition_events').groupBy('type').select('type', db.raw('COUNT(*) as count'));
console.log('\n📅 Événements par type:');
eventsByType.forEach((row: { type: string; count: number }) => {
    console.log(`   - ${row.type}: ${row.count}`);
});

// Mandats par statut
const mandatesByStatus = await db.from('proposition_mandates').groupBy('status').select('status', db.raw('COUNT(*) as count'));
console.log('\n📋 Mandats par statut:');
mandatesByStatus.forEach((row: { status: string; count: number }) => {
    console.log(`   - ${row.status}: ${row.count}`);
});

// Candidatures par statut
const applicationsByStatus = await db.from('mandate_applications').groupBy('status').select('status', db.raw('COUNT(*) as count'));
console.log('\n✋ Candidatures par statut:');
applicationsByStatus.forEach((row: { status: string; count: number }) => {
    console.log(`   - ${row.status}: ${row.count}`);
});

// Votes
const votesCount = await db.from('proposition_votes').count('* as count').first();
console.log(`\n🗳️  Votes configurés: ${votesCount?.count || 0}`);

// Historique de statut
const historyCount = await db.from('proposition_status_histories').count('* as count').first();
console.log(`\n📜 Entrées d'historique de statut: ${historyCount?.count || 0}`);

console.log('\n✅ Vérification terminée !');

await app.terminate();
