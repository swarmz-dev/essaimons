import { test } from '@japa/runner';
import User from '#models/user';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DateTime } from 'luxon';
import { PropositionStatusEnum, PropositionVisibilityEnum, MandateStatusEnum, UserRoleEnum } from '#types';

test.group('Deliverable upload', () => {
    test('upload deliverable to mandate', async ({ client, assert }) => {
        // Get a user
        let user = await User.query().first();
        if (!user) {
            user = await User.create({
                username: `deliverable-user-${Date.now()}`,
                email: `deliverable-user-${Date.now()}@example.com`,
                password: 'password',
                role: UserRoleEnum.ADMIN,
                enabled: true,
                acceptedTermsAndConditions: true,
            });
        }

        assert.isNotNull(user, 'User should exist');

        // Create proposition + mandate owned by the user to ensure permissions
        const proposition = await Proposition.create({
            title: `Deliverable upload test ${Date.now()}`,
            summary: 'Functional deliverable upload',
            detailedDescription: 'Functional deliverable upload description',
            smartObjectives: 'SMART',
            impacts: 'Positive',
            mandatesDescription: 'Mandate description',
            expertise: null,
            status: PropositionStatusEnum.EVALUATE,
            statusStartedAt: DateTime.now(),
            visibility: PropositionVisibilityEnum.PRIVATE,
            clarificationDeadline: DateTime.now().plus({ days: 5 }),
            amendmentDeadline: DateTime.now().plus({ days: 10 }),
            voteDeadline: DateTime.now().plus({ days: 15 }),
            mandateDeadline: DateTime.now().plus({ days: 20 }),
            evaluationDeadline: DateTime.now().plus({ days: 25 }),
            archivedAt: null,
            settingsSnapshot: {},
            creatorId: user!.id,
            visualFileId: null,
        });

        await proposition.refresh();
        assert.exists(proposition.id, 'Proposition id should be defined');

        const mandate = await PropositionMandate.create({
            propositionId: proposition.id,
            title: 'Test Mandate',
            description: null,
            holderUserId: user!.id,
            status: MandateStatusEnum.ACTIVE,
            targetObjectiveRef: null,
            initialDeadline: proposition.mandateDeadline,
            currentDeadline: proposition.mandateDeadline,
            lastStatusUpdateAt: DateTime.now(),
            metadata: {},
        });

        // Create test file
        const testFilePath = join(tmpdir(), 'test-deliverable.txt');
        writeFileSync(testFilePath, 'Test content');

        // Create access token
        const token = await User.accessTokens.create(user!);

        // Make API request
        const response = await client
            .post(`/api/propositions/${proposition.id}/mandates/${mandate.id}/deliverables`)
            .bearerToken(token.value!.release())
            .file('file', testFilePath)
            .field('label', 'Test deliverable')
            .field('objectiveRef', 'Test objective');

        response.assertStatus(201);
        assert.isTrue(response.body().isSuccess);
        assert.isDefined(response.body().deliverable);
    });
});
