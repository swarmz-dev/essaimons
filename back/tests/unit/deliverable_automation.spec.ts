import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import app from '@adonisjs/core/services/app';
import { DateTime } from 'luxon';
import { cuid } from '@adonisjs/core/helpers';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverable from '#models/mandate_deliverable';
import DeliverableEvaluation from '#models/deliverable_evaluation';
import MandateRevocationRequest from '#models/mandate_revocation_request';
import PropositionVote from '#models/proposition_vote';
import File from '#models/file';
import User from '#models/user';
import Language from '#models/language';
import SettingsService from '#services/settings_service';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import { FileTypeEnum, DeliverableVerdictEnum, MandateStatusEnum, MandateRevocationStatusEnum, PropositionStatusEnum, PropositionVisibilityEnum, UserRoleEnum } from '#types';

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

const createUser = async (prefix: string): Promise<User> => {
    const unique = cuid();
    const user = await User.create({
        username: `${prefix}-${unique}`,
        email: `${prefix}-${unique}@example.com`,
        password: 'password',
        role: UserRoleEnum.ADMIN,
        enabled: true,
        acceptedTermsAndConditions: true,
    });
    await user.refresh();
    user.profilePictureId = null;
    await user.save();
    return user;
};

const setupOrganizationSettings = async () => {
    const settingsService = await app.container.make(SettingsService);
    const current = await settingsService.getOrganizationSettings();
    const fallbackLocale = current.fallbackLocale ?? 'en';

    await settingsService.updateOrganizationSettings(
        {
            fallbackLocale,
            translations: {
                name: { [fallbackLocale]: current.name[fallbackLocale] ?? 'Org' },
                description: { [fallbackLocale]: current.description[fallbackLocale] ?? 'Org desc' },
                sourceCodeUrl: { [fallbackLocale]: current.sourceCodeUrl[fallbackLocale] ?? 'https://example.org' },
                copyright: { [fallbackLocale]: current.copyright[fallbackLocale] ?? 'Copyright' },
            },
            workflowAutomation: {
                deliverableRecalcCooldownMinutes: 0,
                evaluationAutoShiftDays: 5,
                nonConformityPercentThreshold: 50,
                nonConformityAbsoluteFloor: 2,
                revocationAutoTriggerDelayDays: 1,
                revocationCheckFrequencyHours: 1,
                deliverableNamingPattern: 'DELIV-{proposition}-{date}-{time}',
            },
        },
        null
    );
};

const createPropositionWithMandate = async (creator: User) => {
    const proposition = await Proposition.create({
        title: `Automation Proposition ${cuid()}`,
        summary: 'Summary',
        detailedDescription: 'Details',
        smartObjectives: 'SMART',
        impacts: 'Impacts',
        mandatesDescription: 'Mandate desc',
        expertise: null,
        status: PropositionStatusEnum.EVALUATE,
        statusStartedAt: DateTime.now(),
        visibility: PropositionVisibilityEnum.PRIVATE,
        clarificationDeadline: DateTime.now().plus({ days: 5 }),
        improvementDeadline: DateTime.now().plus({ days: 10 }),
        voteDeadline: DateTime.now().plus({ days: 15 }),
        mandateDeadline: DateTime.now().plus({ days: 20 }),
        evaluationDeadline: DateTime.now().plus({ days: 25 }),
        archivedAt: null,
        settingsSnapshot: {},
        creatorId: creator.id,
        visualFileId: null,
    });

    const mandate = await PropositionMandate.create({
        propositionId: proposition.id,
        title: 'Automation Mandate',
        description: null,
        holderUserId: creator.id,
        status: MandateStatusEnum.ACTIVE,
        targetObjectiveRef: null,
        initialDeadline: proposition.mandateDeadline,
        currentDeadline: proposition.mandateDeadline,
        lastStatusUpdateAt: DateTime.now(),
        metadata: {},
    });

    return { proposition, mandate };
};

const createDeliverable = async (mandate: PropositionMandate, uploader: User) => {
    const file = await File.create({
        name: 'deliverable.pdf',
        path: `mandates/${mandate.id}/deliverable.pdf`,
        extension: '.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        type: FileTypeEnum.MANDATE_DELIVERABLE,
    });

    const deliverable = await MandateDeliverable.create({
        mandateId: mandate.id,
        fileId: file.id,
        uploadedByUserId: uploader.id,
        label: 'Initial deliverable',
        objectiveRef: null,
        autoFilename: 'AUTO',
        status: 'pending',
        uploadedAt: DateTime.now(),
        evaluationDeadlineSnapshot: null,
        metadata: { status: 'pending' },
    });

    await deliverable.refresh();
    return deliverable;
};

test.group('Deliverable automation service', (group) => {
    group.setup(async () => {
        await testUtils.db().migrate();
        await testUtils.db('logs').migrate();
    });

    group.each.setup(async () => {
        await testUtils.db().truncate();
        await seedLanguages();
        await setupOrganizationSettings();
    });

    group.teardown(async () => {
        await testUtils.db().truncate();
    });

    test('handleDeliverableCreated recalculates deadlines and stores history', async ({ assert }) => {
        const service = await app.container.make(DeliverableAutomationService);
        const creator = await createUser('automation-creator');
        const { proposition, mandate } = await createPropositionWithMandate(creator);
        const deliverable = await createDeliverable(mandate, creator);

        const originalEvaluationDeadline = proposition.evaluationDeadline?.toJSDate()?.getTime() ?? 0;

        await service.handleDeliverableCreated(proposition, mandate, deliverable, creator);

        await proposition.refresh();
        await mandate.refresh();
        await deliverable.refresh();

        assert.isTrue((proposition.evaluationDeadline?.toJSDate()?.getTime() ?? 0) > originalEvaluationDeadline, 'evaluation deadline should move forward');
        assert.exists(mandate.lastAutomationRunAt, 'mandate last automation run is stored');
        const history = (mandate.metadata as any)?.deadlineHistory ?? [];
        assert.isArray(history);
        assert.isAtLeast(history.length, 1);
        assert.equal(history[history.length - 1]?.status, 'scheduled');

        await deliverable.refresh();
        assert.equal(deliverable.status, 'pending');
        const deliverableMetadata = deliverable.metadata as any;
        assert.equal(deliverableMetadata?.status, 'pending');
        assert.exists(deliverableMetadata?.lastRecalculatedAt);
    }).timeout(30000);

    test('handleEvaluationRecorded flags non-conform deliverable and opens procedure', async ({ assert }) => {
        const service = await app.container.make(DeliverableAutomationService);
        const creator = await createUser('automation-evaluator');
        const { proposition, mandate } = await createPropositionWithMandate(creator);
        const deliverable = await createDeliverable(mandate, creator);

        await DeliverableEvaluation.create({
            deliverableId: deliverable.id,
            evaluatorUserId: creator.id,
            verdict: DeliverableVerdictEnum.NON_COMPLIANT,
            recordedAt: DateTime.now(),
            comment: 'Too late',
        });

        await DeliverableEvaluation.create({
            deliverableId: deliverable.id,
            evaluatorUserId: (await createUser('automation-evaluator-2')).id,
            verdict: DeliverableVerdictEnum.NON_COMPLIANT,
            recordedAt: DateTime.now(),
        });

        await service.handleEvaluationRecorded(proposition, mandate, deliverable, creator);

        await deliverable.refresh();
        await mandate.refresh();

        assert.equal(deliverable.status, 'non_conform');
        assert.exists(deliverable.nonConformityFlaggedAt);
        const deliverableMetadata = deliverable.metadata as any;
        assert.equal(deliverableMetadata?.status, 'non_conform');
        const procedure = (deliverable.metadata as any)?.procedure;
        assert.equal(procedure?.status, 'pending');
        assert.exists(procedure?.revocationRequestId);

        const request = await MandateRevocationRequest.find(procedure.revocationRequestId);
        assert.exists(request);
        assert.equal(request?.status, MandateRevocationStatusEnum.PENDING);
    }).timeout(30000);

    test('runRevocationSweep escalates pending procedure to revocation vote', async ({ assert }) => {
        const service = await app.container.make(DeliverableAutomationService);
        const creator = await createUser('automation-revoke');
        const { mandate } = await createPropositionWithMandate(creator);
        const deliverable = await createDeliverable(mandate, creator);

        const request = await MandateRevocationRequest.create({
            mandateId: mandate.id,
            initiatedByUserId: creator.id,
            reason: 'Threshold reached',
            status: MandateRevocationStatusEnum.PENDING,
        });

        deliverable.status = 'non_conform';
        deliverable.nonConformityFlaggedAt = DateTime.now().minus({ days: 2 });
        deliverable.metadata = {
            status: 'non_conform',
            procedure: {
                status: 'pending',
                openedAt: DateTime.now().minus({ days: 2 }).toISO(),
                revocationRequestId: request.id,
            },
        };
        await deliverable.save();

        mandate.metadata = {
            deadlineHistory: [],
            procedures: {
                [deliverable.id]: {
                    status: 'pending',
                    openedAt: DateTime.now().minus({ days: 2 }).toISO(),
                    revocationRequestId: request.id,
                },
            },
        };
        await mandate.save();

        await service.runRevocationSweep();

        await request.refresh();
        await deliverable.refresh();
        await mandate.refresh();

        assert.equal(request.status, MandateRevocationStatusEnum.VOTING);
        assert.exists(request.voteId);

        const vote = await PropositionVote.find(request.voteId ?? '');
        assert.exists(vote);
        if (vote) {
            await vote.load('options');
            assert.lengthOf(vote.options, 2);
        }

        const deliverableMetadata = deliverable.metadata as any;
        assert.equal(deliverable.status, 'escalated');
        assert.equal(deliverableMetadata?.status, 'escalated');
        const procedure = deliverableMetadata?.procedure;
        assert.equal(procedure?.status, 'escalated');
        assert.equal(procedure?.revocationRequestId, request.id);
        assert.equal(procedure?.revocationVoteId, request.voteId);
    }).timeout(30000);

    test('runDeadlineSweep recalculates overdue mandates', async ({ assert }) => {
        const service = await app.container.make(DeliverableAutomationService);
        const creator = await createUser('automation-deadline');
        const { proposition, mandate } = await createPropositionWithMandate(creator);

        const pastMandateDeadline = DateTime.now().minus({ days: 3 });
        const pastEvaluationDeadline = DateTime.now().minus({ days: 1 });
        const previousAutomationRun = DateTime.now().minus({ days: 2 });

        proposition.mandateDeadline = pastMandateDeadline;
        proposition.evaluationDeadline = pastEvaluationDeadline;
        await proposition.save();

        mandate.currentDeadline = pastMandateDeadline;
        mandate.lastAutomationRunAt = previousAutomationRun;
        mandate.metadata = { deadlineHistory: [] };
        await mandate.save();

        await service.runDeadlineSweep();

        await proposition.refresh();
        await mandate.refresh();

        const updatedMandateDeadline = mandate.currentDeadline;
        const updatedEvaluationDeadline = proposition.evaluationDeadline;
        const updatedAutomationRun = mandate.lastAutomationRunAt;

        assert.exists(updatedMandateDeadline);
        assert.exists(updatedEvaluationDeadline);
        assert.exists(updatedAutomationRun);
        assert.isTrue((updatedAutomationRun as DateTime).diff(previousAutomationRun, 'seconds').seconds > 0);

        const base = (updatedAutomationRun as DateTime) ?? DateTime.now();
        const expectedMandateDeadline = base.plus({ days: 5 });
        const expectedEvaluationDeadline = expectedMandateDeadline.plus({ days: 5 });

        if (updatedMandateDeadline) {
            const mandateDiff = Math.abs(updatedMandateDeadline.diff(expectedMandateDeadline, 'minutes').minutes);
            assert.isBelow(mandateDiff, 10, 'mandate deadline should be shifted by evaluationAutoShiftDays');
        }

        if (updatedEvaluationDeadline) {
            assert.equal(updatedEvaluationDeadline.toISODate(), expectedEvaluationDeadline.toISODate(), 'evaluation deadline should cascade shift');
        }

        const history = (mandate.metadata as any)?.deadlineHistory ?? [];
        assert.isAtLeast(history.length, 2);
        assert.equal(history[history.length - 2]?.status, 'missed');
        assert.equal(history[history.length - 1]?.status, 'scheduled');
    }).timeout(30000);
});
