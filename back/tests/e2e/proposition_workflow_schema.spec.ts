import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import app from '@adonisjs/core/services/app';
import { DateTime } from 'luxon';
import PropositionService from '#services/proposition_service';
import User from '#models/user';
import PropositionCategory from '#models/proposition_category';
import Proposition from '#models/proposition';
import PropositionStatusHistory from '#models/proposition_status_history';
import { PropositionStatusEnum, PropositionVisibilityEnum, UserRoleEnum } from '#types';
import { cuid } from '@adonisjs/core/helpers';

const makeUser = async (prefix: string): Promise<User> => {
    const uniqueSuffix = cuid();
    const username = `${prefix}-${uniqueSuffix}`;
    const email = `${prefix}-${uniqueSuffix}@example.com`;
    const user = await User.create({
        username,
        email,
        password: 'password',
        role: UserRoleEnum.USER,
        enabled: true,
        acceptedTermsAndConditions: true,
    });
    await user.refresh();
    return user;
};

test.group('Proposition workflow schema', (group) => {
    group.setup(async () => {
        await testUtils.db().migrate();
        await testUtils.db('logs').migrate();
    });

    group.each.teardown(async () => {
        await testUtils.db().truncate();
    });

    group.teardown(async () => {
        await testUtils.db().truncate();
    });

    test('proposition creation seeds workflow defaults and history', async ({ assert }) => {
        const propositionService: PropositionService = await app.container.make(PropositionService);

        const creator = await makeUser('creator-workflow');
        const rescue = await makeUser('rescue-workflow');

        const category = await PropositionCategory.create({ name: `Workflow category ${cuid()}` });
        await category.refresh();

        const payload = {
            title: 'Workflow proposition',
            summary: 'Summary',
            detailedDescription: 'Details',
            smartObjectives: 'SMART',
            impacts: 'Impacts',
            mandatesDescription: 'Mandates',
            expertise: 'Expertise',
            clarificationDeadline: DateTime.now().plus({ days: 5 }).toISODate()!,
            amendmentDeadline: DateTime.now().plus({ days: 10 }).toISODate()!,
            voteDeadline: DateTime.now().plus({ days: 15 }).toISODate()!,
            mandateDeadline: DateTime.now().plus({ days: 45 }).toISODate()!,
            evaluationDeadline: DateTime.now().plus({ days: 90 }).toISODate()!,
            categoryIds: [String(category.frontId ?? category.id)],
            rescueInitiatorIds: [String(rescue.frontId ?? rescue.id)],
        };

        const proposition: Proposition = await propositionService.create(payload, creator, {});

        assert.equal(proposition.status, PropositionStatusEnum.DRAFT);
        assert.equal(proposition.visibility, PropositionVisibilityEnum.PRIVATE);
        assert.isDefined(proposition.statusStartedAt);
        assert.isNull(proposition.archivedAt);
        assert.deepEqual(proposition.settingsSnapshot ?? {}, {});

        const historyEntries: PropositionStatusHistory[] = await proposition.related('statusHistory').query();
        assert.lengthOf(historyEntries, 1);

        const history = historyEntries[0];
        assert.equal(history.fromStatus, PropositionStatusEnum.DRAFT);
        assert.equal(history.toStatus, PropositionStatusEnum.DRAFT);
        assert.equal(history.triggeredByUserId, creator.id);
        assert.deepEqual(history.metadata ?? {}, {});
    });
});
