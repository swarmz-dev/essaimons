import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import { DateTime } from 'luxon';
import { cuid } from '@adonisjs/core/helpers';
import User from '#models/user';
import PropositionCategory from '#models/proposition_category';
import PropositionStatusHistory from '#models/proposition_status_history';
import Proposition from '#models/proposition';
import { UserRoleEnum } from '#types/enum/user_role_enum';
import { PropositionStatusEnum } from '#types/enum/proposition_status_enum';
import { PropositionEventTypeEnum } from '#types/enum/proposition_event_type_enum';
import { PropositionVotePhaseEnum } from '#types/enum/proposition_vote_phase_enum';
import { PropositionVoteMethodEnum } from '#types/enum/proposition_vote_method_enum';
import { PropositionCommentScopeEnum } from '#types/enum/proposition_comment_scope_enum';
import Language from '#models/language';

const seedLanguages = async () => {
    await Language.updateOrCreate(
        { code: Language.LANGUAGE_ENGLISH.code },
        {
            name: Language.LANGUAGE_ENGLISH.name,
            isFallback: Language.LANGUAGE_ENGLISH.isFallback ?? false,
        }
    );

    await Language.updateOrCreate(
        { code: Language.LANGUAGE_FRENCH.code },
        {
            name: Language.LANGUAGE_FRENCH.name,
            isFallback: Language.LANGUAGE_FRENCH.isFallback ?? false,
        }
    );
};

const makeUser = async (prefix: string): Promise<User> => {
    const uniqueSuffix = cuid();
    const user = await User.create({
        username: `${prefix}-${uniqueSuffix}`,
        email: `${prefix}-${uniqueSuffix}@example.com`,
        password: 'password',
        role: UserRoleEnum.USER,
        enabled: true,
        acceptedTermsAndConditions: true,
    });
    await user.refresh();
    return user;
};

const createPropositionFixture = async (client: any) => {
    const creator = await makeUser('creator-workflow-api');
    const rescue = await makeUser('rescue-workflow-api');

    const category = await PropositionCategory.create({ name: `Workflow category ${cuid()}` });
    await category.refresh();

    const creatorToken = await User.accessTokens.create(creator);
    const creatorBearer = creatorToken.toJSON().token;
    if (!creatorBearer) {
        throw new Error('Failed to obtain creator bearer token');
    }

    const createResponse = await client
        .post('/api/propositions')
        .header('accept-language', 'en')
        .bearerToken(creatorBearer)
        .fields({
            title: `Workflow Proposition ${cuid()}`,
            summary: 'Summary',
            detailedDescription: 'Details',
            smartObjectives: 'SMART',
            impacts: 'Impacts',
            mandatesDescription: 'Mandates',
            expertise: 'Expertise',
            categoryIds: String(category.frontId ?? category.id),
            rescueInitiatorIds: String(rescue.frontId ?? rescue.id),
            clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
            improvementDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
            voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
            mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
            evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
        });

    createResponse.assertStatus(201);

    return {
        propositionId: createResponse.body().proposition.id as string,
        creatorBearer,
    };
};

test.group('Proposition workflow API', (group) => {
    group.setup(async () => {
        await testUtils.db().migrate();
        await testUtils.db('logs').migrate();
        await seedLanguages();
    });

    group.each.teardown(async () => {
        await testUtils.db().truncate();
    });

    group.teardown(async () => {
        await testUtils.db().truncate();
    });

    test('initiator can transition draft proposition to clarify', async ({ client, assert }) => {
        const creator = await makeUser('creator-workflow-api');
        const rescue = await makeUser('rescue-workflow-api');

        const category = await PropositionCategory.create({ name: `Workflow category ${cuid()}` });
        await category.refresh();

        const token = await User.accessTokens.create(creator);
        const bearerToken = token.toJSON().token;
        if (!bearerToken) {
            throw new Error('Failed to obtain bearer token');
        }

        const createResponse = await client
            .post('/api/propositions')
            .header('accept-language', 'en')
            .bearerToken(bearerToken)
            .fields({
                title: 'Workflow API Proposition',
                summary: 'Summary',
                detailedDescription: 'Details',
                smartObjectives: 'SMART',
                impacts: 'Impacts',
                mandatesDescription: 'Mandates',
                expertise: 'Expertise',
                categoryIds: String(category.frontId ?? category.id),
                rescueInitiatorIds: String(rescue.frontId ?? rescue.id),
                clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
                improvementDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
                voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
                mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
                evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
            });

        createResponse.assertStatus(201);
        const created = createResponse.body().proposition;
        const propositionId: string = created.id;

        const transitionResponse = await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(bearerToken)
            .json({ status: PropositionStatusEnum.CLARIFY, reason: 'Ready for clarification' });

        transitionResponse.assertStatus(200);
        assert.equal(transitionResponse.body().proposition.status, PropositionStatusEnum.CLARIFY);

        const numericId = Number(propositionId);
        const persisted = Number.isFinite(numericId) ? await Proposition.query().where('front_id', numericId).firstOrFail() : await Proposition.findOrFail(propositionId);

        const historyEntries = await PropositionStatusHistory.query().where('proposition_id', persisted.id).orderBy('created_at', 'asc');

        assert.isAtLeast(historyEntries.length, 2);
        assert.equal(historyEntries[historyEntries.length - 1].toStatus, PropositionStatusEnum.CLARIFY);
        assert.equal(historyEntries[historyEntries.length - 1].reason, 'Ready for clarification');
    });

    test('non initiator cannot transition proposition status', async ({ client, assert }) => {
        const creator = await makeUser('creator-workflow-api');
        const rescue = await makeUser('rescue-workflow-api');
        const outsider = await makeUser('outsider-workflow-api');

        const category = await PropositionCategory.create({ name: `Workflow category ${cuid()}` });
        await category.refresh();

        const creatorToken = await User.accessTokens.create(creator);
        const creatorBearer = creatorToken.toJSON().token;
        if (!creatorBearer) {
            throw new Error('Failed to obtain creator bearer token');
        }

        const createResponse = await client
            .post('/api/propositions')
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .fields({
                title: 'Workflow Forbidden Proposition',
                summary: 'Summary',
                detailedDescription: 'Details',
                smartObjectives: 'SMART',
                impacts: 'Impacts',
                mandatesDescription: 'Mandates',
                expertise: 'Expertise',
                categoryIds: String(category.frontId ?? category.id),
                rescueInitiatorIds: String(rescue.frontId ?? rescue.id),
                clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
                improvementDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
                voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
                mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
                evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
            });

        createResponse.assertStatus(201);
        const propositionId: string = createResponse.body().proposition.id;

        const outsiderToken = await User.accessTokens.create(outsider);
        const outsiderBearer = outsiderToken.toJSON().token;
        if (!outsiderBearer) {
            throw new Error('Failed to obtain outsider bearer token');
        }

        const transitionResponse = await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(outsiderBearer)
            .json({ status: PropositionStatusEnum.CLARIFY, reason: 'Attempted escalation' });

        transitionResponse.assertStatus(403);

        const numericId = Number(propositionId);
        const persisted = Number.isFinite(numericId) ? await Proposition.query().where('front_id', numericId).firstOrFail() : await Proposition.findOrFail(propositionId);

        const historyEntries = await PropositionStatusHistory.query().where('proposition_id', persisted.id);
        assert.isTrue(historyEntries.every((entry) => entry.toStatus === PropositionStatusEnum.DRAFT));
    });

    test('initiator can manage events, votes, mandates and contributor can comment', async ({ client, assert }) => {
        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        const eventResponse = await client
            .post(`/api/propositions/${propositionId}/events`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({
                type: PropositionEventTypeEnum.MILESTONE,
                title: 'Kick-off',
                description: 'Initial meeting',
                startAt: DateTime.now().plus({ days: 1 }).toISO(),
            });
        eventResponse.assertStatus(201);

        const voteResponse = await client
            .post(`/api/propositions/${propositionId}/votes`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({
                phase: PropositionVotePhaseEnum.VOTE,
                method: PropositionVoteMethodEnum.BINARY,
                title: 'Adopt proposal',
                options: [{ label: 'Yes' }, { label: 'No' }],
            });
        voteResponse.assertStatus(201);
        const voteId = voteResponse.body().vote.id;

        const statusResponse = await client.post(`/api/propositions/${propositionId}/votes/${voteId}/status`).header('accept-language', 'en').bearerToken(creatorBearer).json({ status: 'open' });
        statusResponse.assertStatus(200);

        const mandateResponse = await client
            .post(`/api/propositions/${propositionId}/mandates`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ title: 'Mandate 1', description: 'Lead implementation' });
        mandateResponse.assertStatus(201);

        const commenter = await makeUser('commenter-workflow');
        const commenterToken = await User.accessTokens.create(commenter);
        const commenterBearer = commenterToken.toJSON().token;
        if (!commenterBearer) throw new Error('missing token');

        const commentResponse = await client.post(`/api/propositions/${propositionId}/comments`).header('accept-language', 'en').bearerToken(commenterBearer).json({
            scope: PropositionCommentScopeEnum.CLARIFICATION,
            content: 'Need more details on timeline.',
        });
        commentResponse.assertStatus(201);

        const listResponse = await client.get(`/api/propositions/${propositionId}/events`).bearerToken(creatorBearer).header('accept-language', 'en');
        listResponse.assertStatus(200);
        assert.lengthOf(listResponse.body().events, 1);

        const votesList = await client.get(`/api/propositions/${propositionId}/votes`).bearerToken(creatorBearer).header('accept-language', 'en');
        votesList.assertStatus(200);
        assert.lengthOf(votesList.body().votes, 1);

        const mandatesList = await client.get(`/api/propositions/${propositionId}/mandates`).bearerToken(creatorBearer).header('accept-language', 'en');
        mandatesList.assertStatus(200);
        assert.lengthOf(mandatesList.body().mandates, 1);

        const commentsList = await client.get(`/api/propositions/${propositionId}/comments`).bearerToken(creatorBearer).header('accept-language', 'en');
        commentsList.assertStatus(200);
        assert.lengthOf(commentsList.body().comments, 1);

        const commentId = commentsList.body().comments[0].id;
        const deleteResponse = await client.delete(`/api/propositions/${propositionId}/comments/${commentId}`).bearerToken(creatorBearer).header('accept-language', 'en');
        deleteResponse.assertStatus(204);
    });
});
