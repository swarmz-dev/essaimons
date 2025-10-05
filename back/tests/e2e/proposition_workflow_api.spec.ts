import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import app from '@adonisjs/core/services/app';
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
import { MandateStatusEnum } from '#types/enum/mandate_status_enum';
import SettingsService from '#services/settings_service';
import Language from '#models/language';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import PropositionMandate from '#models/proposition_mandate';
import PropositionRepository from '#repositories/proposition_repository';

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
            categoryIds: String(category.id),
            rescueInitiatorIds: String(rescue.id),
            clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
            amendmentDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
            voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
            mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
            evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
            isDraft: false,
        });

    createResponse.assertStatus(201);

    return {
        propositionId: createResponse.body().proposition.id as string,
        creatorBearer,
        creator,
    };
};

const updatePermissions = async (overrides: Record<string, Record<string, Record<string, boolean>>>) => {
    const settingsService = await app.container.make(SettingsService);
    const current = await settingsService.getOrganizationSettings();
    const fallback = current.fallbackLocale ?? 'en';
    const ensureTranslation = (map: Record<string, string>, defaultValue: string) => ({
        ...map,
        [fallback]: map[fallback] ?? defaultValue,
    });

    await settingsService.updateOrganizationSettings(
        {
            fallbackLocale: fallback,
            translations: {
                name: ensureTranslation(current.name, 'Organization'),
                description: ensureTranslation(current.description, 'Description'),
                sourceCodeUrl: ensureTranslation(current.sourceCodeUrl, 'https://example.org'),
                copyright: ensureTranslation(current.copyright, 'Copyright'),
            },
            permissions: { perStatus: overrides },
        },
        null
    );
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
                categoryIds: String(category.id),
                rescueInitiatorIds: String(rescue.id),
                clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
                amendmentDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
                voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
                mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
                evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
                isDraft: true,
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

        const persisted = await Proposition.findOrFail(propositionId);

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
                categoryIds: String(category.id),
                rescueInitiatorIds: String(rescue.id),
                clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
                amendmentDeadline: DateTime.now().plus({ days: 10 }).toISODate(),
                voteDeadline: DateTime.now().plus({ days: 15 }).toISODate(),
                mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate(),
                evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate(),
                isDraft: true,
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

        const persisted = await Proposition.findOrFail(propositionId);

        const historyEntries = await PropositionStatusHistory.query().where('proposition_id', persisted.id);
        assert.isTrue(historyEntries.every((entry) => entry.toStatus === PropositionStatusEnum.DRAFT));
    });

    test('initiator can manage events, votes, mandates and contributor can comment', async ({ client, assert }) => {
        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.CLARIFY, reason: 'Move to clarify' })
            .then((res) => res.assertStatus(200));

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.AMEND, reason: 'Start amendments' })
            .then((res) => res.assertStatus(200));

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

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.VOTE, reason: 'Ready to configure vote' })
            .then((res) => res.assertStatus(200));

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

        await client
            .post(`/api/propositions/${propositionId}/votes/${voteId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: 'open' })
            .then((res) => res.assertStatus(200));

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.MANDATE, reason: 'Select mandates' })
            .then((res) => res.assertStatus(200));

        const mandateResponse = await client
            .post(`/api/propositions/${propositionId}/mandates`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ title: 'Mandate 1', description: 'Lead implementation' });
        mandateResponse.assertStatus(201);

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.EVALUATE, reason: 'Start evaluation phase' })
            .then((res) => res.assertStatus(200));

        const commenter = await makeUser('commenter-workflow');
        const commenterToken = await User.accessTokens.create(commenter);
        const commenterBearer = commenterToken.toJSON().token;
        if (!commenterBearer) throw new Error('missing token');

        const commentResponse = await client.post(`/api/propositions/${propositionId}/comments`).header('accept-language', 'en').bearerToken(commenterBearer).json({
            scope: PropositionCommentScopeEnum.EVALUATION,
            content: 'Deliverable needs clarification.',
        });
        commentResponse.assertStatus(201);

        const eventsList = await client.get(`/api/propositions/${propositionId}/events`).bearerToken(creatorBearer).header('accept-language', 'en');
        eventsList.assertStatus(200);
        assert.lengthOf(eventsList.body().events, 1);

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
    }).timeout(120000);

    test('contributor cannot manage events by default', async ({ client }) => {
        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.CLARIFY })
            .then((res) => res.assertStatus(200));
        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.AMEND })
            .then((res) => res.assertStatus(200));

        const contributor = await makeUser('contrib-default');
        const token = await User.accessTokens.create(contributor);
        const bearer = token.toJSON().token;
        if (!bearer) throw new Error('missing token');

        const response = await client
            .post(`/api/propositions/${propositionId}/events`)
            .header('accept-language', 'en')
            .bearerToken(bearer)
            .json({ type: PropositionEventTypeEnum.MILESTONE, title: 'Community meetup' });
        response.assertStatus(403);
    }).timeout(60000);

    test('permissions override allows contributor to manage events', async ({ client }) => {
        await updatePermissions({ amend: { contributor: { manage_events: true } } });

        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.CLARIFY })
            .then((res) => res.assertStatus(200));
        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.AMEND })
            .then((res) => res.assertStatus(200));

        const contributor = await makeUser('contrib-override');
        const token = await User.accessTokens.create(contributor);
        const bearer = token.toJSON().token;
        if (!bearer) throw new Error('missing token');

        const response = await client
            .post(`/api/propositions/${propositionId}/events`)
            .header('accept-language', 'en')
            .bearerToken(bearer)
            .json({ type: PropositionEventTypeEnum.MILESTONE, title: 'Community meetup' });
        response.assertStatus(201);

        await updatePermissions({ amend: { contributor: { manage_events: false } } });
    }).timeout(60000);

    test('cannot update vote once opened', async ({ client }) => {
        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.CLARIFY })
            .then((res) => res.assertStatus(200));
        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.AMEND })
            .then((res) => res.assertStatus(200));
        await client
            .post(`/api/propositions/${propositionId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: PropositionStatusEnum.VOTE })
            .then((res) => res.assertStatus(200));

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

        await client
            .post(`/api/propositions/${propositionId}/votes/${voteId}/status`)
            .header('accept-language', 'en')
            .bearerToken(creatorBearer)
            .json({ status: 'open' })
            .then((res) => res.assertStatus(200));

        const updateResponse = await client.put(`/api/propositions/${propositionId}/votes/${voteId}`).header('accept-language', 'en').bearerToken(creatorBearer).json({ title: 'Updated title' });
        updateResponse.assertStatus(400);
    }).timeout(60000);

    test('workflow permissions toggle evaluation comments for mandated vs contributor', async ({ client, assert }) => {
        const { propositionId, creatorBearer } = await createPropositionFixture(client);

        let workflowService = await app.container.make(PropositionWorkflowService);
        const propositionRepository = await app.container.make(PropositionRepository);

        let proposition = await propositionRepository.findByPublicId(propositionId, ['rescueInitiators', 'mandates']);
        if (!proposition) {
            throw new Error('proposition not found');
        }

        const transitionTo = async (status: PropositionStatusEnum) => {
            const transitionResponse = await client.post(`/api/propositions/${propositionId}/status`).header('accept-language', 'en').bearerToken(creatorBearer).json({ status });

            transitionResponse.assertStatus(200);

            const refreshed = await propositionRepository.findByPublicId(propositionId, ['rescueInitiators', 'mandates']);
            if (!refreshed) {
                throw new Error(`proposition not found after transitioning to ${status}`);
            }
            proposition = refreshed;
        };

        const transitionOrder = [PropositionStatusEnum.CLARIFY, PropositionStatusEnum.AMEND, PropositionStatusEnum.VOTE, PropositionStatusEnum.MANDATE];

        for (const status of transitionOrder) {
            await transitionTo(status);
        }

        const mandatedUser = await makeUser('mandated-user');
        await PropositionMandate.create({
            propositionId: proposition.id,
            title: 'Mandate 1',
            description: 'Lead delivery',
            holderUserId: mandatedUser.id,
            status: MandateStatusEnum.ACTIVE,
        });

        proposition = await propositionRepository.findByPublicId(propositionId, ['rescueInitiators', 'mandates']);
        if (!proposition) {
            throw new Error('proposition not found after mandate');
        }

        await transitionTo(PropositionStatusEnum.EVALUATE);

        await updatePermissions({
            evaluate: {
                mandated: { comment_evaluation: true },
                contributor: { comment_evaluation: true },
            },
        });
        workflowService = await app.container.make(PropositionWorkflowService);

        const mandatedAllowed = await workflowService.canPerform(proposition, mandatedUser, 'comment_evaluation');
        assert.isTrue(mandatedAllowed);

        const contributor = await makeUser('evaluation-contributor');
        const contributorAllowed = await workflowService.canPerform(proposition, contributor, 'comment_evaluation');
        assert.isTrue(contributorAllowed);

        await updatePermissions({ evaluate: { contributor: { comment_evaluation: false } } });
        workflowService = await app.container.make(PropositionWorkflowService);
        const contributorDenied = await workflowService.canPerform(proposition, contributor, 'comment_evaluation');
        assert.isFalse(contributorDenied);

        await updatePermissions({ evaluate: { contributor: { comment_evaluation: true } } });
    }).timeout(60000);
});
