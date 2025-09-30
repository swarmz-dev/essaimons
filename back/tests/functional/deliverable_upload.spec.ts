import { test } from '@japa/runner';
import User from '#models/user';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.group('Deliverable upload', () => {
    test('upload deliverable to mandate', async ({ client, assert }) => {
        // Get a user
        const user = await User.query().first();
        assert.isNotNull(user, 'User should exist');

        // Find proposition 209
        const proposition = await Proposition.query().where('public_id', 209).first();

        assert.isNotNull(proposition, 'Proposition 209 should exist');

        // Find mandate
        const mandate = await PropositionMandate.query().where('id', '8acd9401-6a42-4cf7-a724-e4335ae86a94').first();

        assert.isNotNull(mandate, 'Mandate should exist');

        // Create test file
        const testFilePath = join(tmpdir(), 'test-deliverable.txt');
        writeFileSync(testFilePath, 'Test content');

        // Create access token
        const token = await User.accessTokens.create(user!);

        // Make API request
        const response = await client
            .post(`/api/propositions/${proposition!.publicId}/mandates/${mandate!.id}/deliverables`)
            .bearerToken(token.value!.release())
            .file('file', testFilePath)
            .field('label', 'Test deliverable')
            .field('objectiveRef', 'Test objective');

        console.log('Response status:', response.status());
        console.log('Response body:', response.body());

        response.assertStatus(201);
        assert.isTrue(response.body().isSuccess);
        assert.isDefined(response.body().deliverable);
    });
});
