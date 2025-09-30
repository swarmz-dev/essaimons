import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';
import User from '#models/user';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverableService from '#services/mandate_deliverable_service';
import { MultipartFile } from '@adonisjs/bodyparser/types';
import { createReadStream } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function testDeliverableUpload() {
    console.log('Starting deliverable upload test...');

    try {
        // 1. Get a user
        console.log('1. Finding user...');
        const user = await User.query().first();
        if (!user) {
            console.error('No users found in database');
            return;
        }
        console.log(`   Found user: ${user.username} (${user.id})`);

        // 2. Find the proposition
        console.log('2. Finding proposition...');
        const proposition = await Proposition.query().where('public_id', 209).preload('creator').first();

        if (!proposition) {
            console.error('Proposition 209 not found');
            return;
        }
        console.log(`   Found proposition: ${proposition.id}`);

        // 3. Find the mandate
        console.log('3. Finding mandate...');
        const mandate = await PropositionMandate.query().where('id', '8acd9401-6a42-4cf7-a724-e4335ae86a94').first();

        if (!mandate) {
            console.error('Mandate not found');
            return;
        }
        console.log(`   Found mandate: ${mandate.id}`);

        // 4. Create a test file
        console.log('4. Creating test file...');
        const testFilePath = join(tmpdir(), 'test-deliverable.txt');
        writeFileSync(testFilePath, 'Test deliverable content - ' + new Date().toISOString());

        // Create a fake MultipartFile object
        const fakeFile: Partial<MultipartFile> = {
            clientName: 'test-deliverable.txt',
            size: 100,
            type: 'text',
            subtype: 'plain',
            tmpPath: testFilePath,
            headers: { 'content-type': 'text/plain' },
            isValid: true,
            validated: true,
            errors: [],
        };

        // 5. Upload the deliverable
        console.log('5. Uploading deliverable...');
        const deliverableService = await app.container.make(MandateDeliverableService);

        const result = await deliverableService.upload(
            proposition,
            mandate,
            user,
            {
                label: 'Test deliverable',
                objectiveRef: 'Test objective',
            },
            fakeFile as MultipartFile
        );

        console.log('SUCCESS! Deliverable uploaded:');
        console.log('  Deliverable ID:', result.deliverable.id);
        console.log('  File ID:', result.deliverable.fileId);
        console.log('  Uploaded by:', result.deliverable.uploadedBy?.username || 'undefined');
    } catch (error: any) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        console.error('Full error:', error);
    }
}

// Run the test
testDeliverableUpload()
    .then(() => {
        console.log('Test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
