import { test } from '@japa/runner';
import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import User from '#models/user';
import PropositionCategory from '#models/proposition_category';
import { UserRoleEnum } from '#types/enum/user_role_enum';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import File from '#models/file';
import { DateTime } from 'luxon';
import { cuid } from '@adonisjs/core/helpers';
import Language from '#models/language';
import { join } from 'node:path';

const storageBasePath = process.env.STORAGE_LOCAL_BASE_PATH || 'static';

const pngPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9XYRZywAAAAASUVORK5CYII=', 'base64');

const pdfDummy = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<>>\nstartxref\n0\n%%EOF\n', 'utf8');

const cleanupStorage = async () => {
    await rm(app.makePath(storageBasePath), { recursive: true, force: true });
};

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

test.group('Proposition uploads', (group) => {
    group.setup(async () => {
        process.env.STORAGE_DRIVER = 'local';
        process.env.STORAGE_LOCAL_BASE_PATH = storageBasePath;
        await testUtils.db().migrate();
        await testUtils.db('logs').migrate();
        await cleanupStorage();
        await seedLanguages();
    });

    group.each.teardown(async () => {
        await testUtils.db().truncate();
        await cleanupStorage();
    });

    group.teardown(async () => {
        await testUtils.db().truncate();
        await cleanupStorage();
    });

    test('stores visual and attachments on local storage', async ({ client, assert }) => {
        const creatorEmail = `creator-${cuid()}@example.com`;
        const rescueEmail = `rescue-${cuid()}@example.com`;

        const creator = await User.create({
            username: 'creator',
            email: creatorEmail,
            password: 'password',
            role: UserRoleEnum.USER,
            enabled: true,
            acceptedTermsAndConditions: true,
        });
        await creator.refresh();

        const rescueInitiator = await User.create({
            username: 'rescue',
            email: rescueEmail,
            password: 'password',
            role: UserRoleEnum.USER,
            enabled: true,
            acceptedTermsAndConditions: true,
        });
        await rescueInitiator.refresh();

        const category = await PropositionCategory.create({ name: `Category-${cuid()}` });
        await category.refresh();

        const token = await User.accessTokens.create(creator);
        const bearerToken = token.toJSON().token;
        if (!bearerToken) {
            throw new Error('Failed to get bearer token value from access token');
        }

        const fixturesDir = app.makePath('tmp/test-fixtures');
        await mkdir(fixturesDir, { recursive: true });

        const visualPath = join(fixturesDir, `visual-${cuid()}.png`);
        const attachmentPath = join(fixturesDir, `attachment-${cuid()}.pdf`);

        await writeFile(visualPath, pngPixel);
        await writeFile(attachmentPath, pdfDummy);

        let response: any;
        try {
            response = await client
                .post('/api/propositions')
                .header('accept-language', 'en')
                .bearerToken(bearerToken)
                .fields({
                    title: 'Test proposition',
                    summary: 'Summary',
                    detailedDescription: 'Detailed description',
                    smartObjectives: 'SMART',
                    impacts: 'Impacts',
                    mandatesDescription: 'Mandates',
                    expertise: 'Expertise',
                    categoryIds: String(category.frontId ?? category.id),
                    rescueInitiatorIds: String(rescueInitiator.frontId ?? rescueInitiator.id),
                    clarificationDeadline: DateTime.now().plus({ days: 1 }).toISODate(),
                    amendmentDeadline: DateTime.now().plus({ days: 2 }).toISODate(),
                    voteDeadline: DateTime.now().plus({ days: 3 }).toISODate(),
                    mandateDeadline: DateTime.now().plus({ days: 4 }).toISODate(),
                    evaluationDeadline: DateTime.now().plus({ days: 5 }).toISODate(),
                })
                .file('visual', visualPath)
                .file('attachments', attachmentPath);
        } finally {
            await Promise.all([rm(visualPath, { force: true }), rm(attachmentPath, { force: true })]);
        }

        response.assertStatus(201);

        const body = response.body();
        const payload = body.proposition ?? {};
        const fileIds = [payload.visual?.id, ...(payload.attachments ?? []).map((item: any) => item?.id)].filter((value): value is string => typeof value === 'string' && value.length > 0);

        assert.equal(fileIds.length, 2);

        const storedFiles = await File.query().whereIn('id', fileIds);
        assert.equal(storedFiles.length, fileIds.length);

        const fileTypes = storedFiles.map((file) => file.type).sort();
        assert.deepEqual(fileTypes, [FileTypeEnum.PROPOSITION_ATTACHMENT, FileTypeEnum.PROPOSITION_VISUAL].sort());

        for (const file of storedFiles) {
            const fullPath = app.makePath(storageBasePath, file.path);
            const fileStats = await stat(fullPath);
            assert.isAbove(fileStats.size, 0);
        }
    });
});
