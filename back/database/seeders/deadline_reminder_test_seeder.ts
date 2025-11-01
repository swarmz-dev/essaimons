import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { DateTime } from 'luxon';
import Proposition from '#models/proposition';
import User from '#models/user';
import PropositionCategory from '#models/proposition_category';
import PropositionComment from '#models/proposition_comment';
import PropositionVote from '#models/proposition_vote';
import VoteBallot from '#models/vote_ballot';
import {
    PropositionStatusEnum,
    PropositionVisibilityEnum,
    PropositionVoteMethodEnum,
    PropositionVotePhaseEnum,
    PropositionVoteStatusEnum,
    PropositionCommentScopeEnum,
    PropositionCommentVisibilityEnum,
} from '#types';

export default class extends BaseSeeder {
    async run() {
        // Get or create test users
        const creator = await User.firstOrCreate(
            { email: 'deadline-test-creator@example.com' },
            {
                username: 'deadline-creator',
                email: 'deadline-test-creator@example.com',
                password: 'Test123!@#',
                enabled: true,
            }
        );

        const contributor1 = await User.firstOrCreate(
            { email: 'deadline-contributor1@example.com' },
            {
                username: 'contributor1',
                email: 'deadline-contributor1@example.com',
                password: 'Test123!@#',
                enabled: true,
            }
        );

        const contributor2 = await User.firstOrCreate(
            { email: 'deadline-contributor2@example.com' },
            {
                username: 'contributor2',
                email: 'deadline-contributor2@example.com',
                password: 'Test123!@#',
                enabled: true,
            }
        );

        const rescueInitiator = await User.firstOrCreate(
            { email: 'deadline-rescue@example.com' },
            {
                username: 'rescue-initiator',
                email: 'deadline-rescue@example.com',
                password: 'Test123!@#',
                enabled: true,
            }
        );

        // Get a category (or create one)
        let category = await PropositionCategory.first();
        if (!category) {
            category = await PropositionCategory.create({
                name: 'Test Category',
            });
        }

        // Create proposition with 48-hour clarification deadline
        const prop48h = await Proposition.create({
            title: '[TEST] Proposition with 48h clarification deadline',
            summary: 'This proposition has a clarification deadline in 48 hours for testing deadline reminders.',
            detailedDescription: 'Detailed description for testing.',
            smartObjectives: 'Test SMART objectives.',
            impacts: 'Test impacts.',
            mandatesDescription: 'Test mandates.',
            expertise: 'Test expertise.',
            creatorId: creator.id,
            status: PropositionStatusEnum.CLARIFY,
            visibility: PropositionVisibilityEnum.PUBLIC,
            clarificationDeadline: DateTime.now().plus({ hours: 48 }),
            amendmentDeadline: DateTime.now().plus({ days: 10 }),
            voteDeadline: DateTime.now().plus({ days: 15 }),
            mandateDeadline: DateTime.now().plus({ days: 30 }),
            evaluationDeadline: DateTime.now().plus({ days: 60 }),
        });

        await prop48h.related('categories').attach([category.id]);
        await prop48h.related('rescueInitiators').attach([rescueInitiator.id]);

        // Add comments from contributors
        await PropositionComment.create({
            propositionId: prop48h.id,
            authorId: contributor1.id,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: 'Test clarification comment from contributor 1',
        });

        await PropositionComment.create({
            propositionId: prop48h.id,
            authorId: contributor2.id,
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            visibility: PropositionCommentVisibilityEnum.PUBLIC,
            content: 'Test clarification comment from contributor 2',
        });

        // Create proposition with 24-hour vote deadline
        const prop24h = await Proposition.create({
            title: '[TEST] Proposition with 24h vote deadline',
            summary: 'This proposition has a vote deadline in 24 hours for testing 24h initiator reminders.',
            detailedDescription: 'Detailed description for testing.',
            smartObjectives: 'Test SMART objectives.',
            impacts: 'Test impacts.',
            mandatesDescription: 'Test mandates.',
            expertise: 'Test expertise.',
            creatorId: creator.id,
            status: PropositionStatusEnum.VOTE,
            visibility: PropositionVisibilityEnum.PUBLIC,
            clarificationDeadline: DateTime.now().minus({ days: 5 }),
            amendmentDeadline: DateTime.now().minus({ days: 2 }),
            voteDeadline: DateTime.now().plus({ hours: 24 }),
            mandateDeadline: DateTime.now().plus({ days: 20 }),
            evaluationDeadline: DateTime.now().plus({ days: 50 }),
        });

        await prop24h.related('categories').attach([category.id]);
        await prop24h.related('rescueInitiators').attach([rescueInitiator.id]);

        // Create proposition with upcoming vote (for weekly digest)
        const propWeekly = await Proposition.create({
            title: '[TEST] Proposition with vote in 5 days (weekly digest)',
            summary: 'This proposition has a vote opening in 5 days for testing weekly vote digest.',
            detailedDescription: 'Detailed description for testing.',
            smartObjectives: 'Test SMART objectives.',
            impacts: 'Test impacts.',
            mandatesDescription: 'Test mandates.',
            expertise: 'Test expertise.',
            creatorId: creator.id,
            status: PropositionStatusEnum.VOTE,
            visibility: PropositionVisibilityEnum.PUBLIC,
            clarificationDeadline: DateTime.now().minus({ days: 10 }),
            amendmentDeadline: DateTime.now().minus({ days: 5 }),
            voteDeadline: DateTime.now().plus({ days: 5 }),
            mandateDeadline: DateTime.now().plus({ days: 25 }),
            evaluationDeadline: DateTime.now().plus({ days: 55 }),
        });

        await propWeekly.related('categories').attach([category.id]);

        // Create a vote for weekly digest testing
        const vote = await PropositionVote.create({
            propositionId: propWeekly.id,
            title: 'Test Vote for Weekly Digest',
            phase: PropositionVotePhaseEnum.VOTE,
            method: PropositionVoteMethodEnum.BINARY,
            openAt: DateTime.now().plus({ days: 3 }),
            closeAt: DateTime.now().plus({ days: 5 }),
            status: PropositionVoteStatusEnum.SCHEDULED,
            metadata: { requiredParticipation: 50 },
        });

        await vote.related('options').createMany([
            { label: 'Yes', position: 1 },
            { label: 'No', position: 2 },
        ]);

        // Create proposition with vote closing soon (for quorum warning)
        const propQuorum = await Proposition.create({
            title: '[TEST] Proposition with vote closing in 48h - Quorum at risk',
            summary: 'This vote closes in 48 hours and needs more participants to reach quorum.',
            detailedDescription: 'Detailed description for testing.',
            smartObjectives: 'Test SMART objectives.',
            impacts: 'Test impacts.',
            mandatesDescription: 'Test mandates.',
            expertise: 'Test expertise.',
            creatorId: creator.id,
            status: PropositionStatusEnum.VOTE,
            visibility: PropositionVisibilityEnum.PUBLIC,
            clarificationDeadline: DateTime.now().minus({ days: 15 }),
            amendmentDeadline: DateTime.now().minus({ days: 10 }),
            voteDeadline: DateTime.now().plus({ hours: 48 }),
            mandateDeadline: DateTime.now().plus({ days: 20 }),
            evaluationDeadline: DateTime.now().plus({ days: 50 }),
        });

        await propQuorum.related('categories').attach([category.id]);

        const quorumVote = await PropositionVote.create({
            propositionId: propQuorum.id,
            title: 'Test Vote - Quorum at Risk',
            phase: PropositionVotePhaseEnum.VOTE,
            method: PropositionVoteMethodEnum.BINARY,
            openAt: DateTime.now().minus({ hours: 24 }),
            closeAt: DateTime.now().plus({ hours: 48 }),
            status: PropositionVoteStatusEnum.OPEN,
            metadata: { requiredParticipation: 50 }, // 50% required
        });

        await quorumVote.related('options').createMany([
            { label: 'Yes', position: 1 },
            { label: 'No', position: 2 },
        ]);

        // Have only 1 person vote (not enough for quorum)
        const voteOption = await quorumVote.related('options').query().where('label', 'Yes').firstOrFail();
        await VoteBallot.create({
            voteId: quorumVote.id,
            voterId: contributor1.id,
            payload: { optionId: voteOption.id },
        });

        console.log('✅ Deadline reminder test data seeded successfully!');
        console.log('');
        console.log('Test propositions created:');
        console.log(`- "${prop48h.title}" (ID: ${prop48h.id})`);
        console.log(`- "${prop24h.title}" (ID: ${prop24h.id})`);
        console.log(`- "${propWeekly.title}" (ID: ${propWeekly.id})`);
        console.log(`- "${propQuorum.title}" (ID: ${propQuorum.id})`);
        console.log('');
        console.log('Test users created:');
        console.log(`- Creator: ${creator.email}`);
        console.log(`- Rescue Initiator: ${rescueInitiator.email}`);
        console.log(`- Contributor 1: ${contributor1.email}`);
        console.log(`- Contributor 2: ${contributor2.email}`);
        console.log('');
        console.log('Now run: node ace send:deadline-reminders');
    }
}
