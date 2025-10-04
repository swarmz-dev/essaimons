import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import path from 'node:path';
import { cuid } from '@adonisjs/core/helpers';
import { DateTime } from 'luxon';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverable from '#models/mandate_deliverable';
import DeliverableEvaluation from '#models/deliverable_evaluation';
import File from '#models/file';
import type User from '#models/user';
import FileService from '#services/file_service';
import SlugifyService from '#services/slugify_service';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import SettingsService from '#services/settings_service';
import { FileTypeEnum, DeliverableVerdictEnum } from '#types';
import type { SerializedMandate, SerializedMandateDeliverable, SerializedProposition } from '#types';
import { serializeMandate, serializeMandateDeliverable } from '#serializers/mandate_serializer';
import type { MultipartFile } from '@adonisjs/bodyparser/types';
import logger from '@adonisjs/core/services/logger';
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';

interface UploadDeliverablePayload {
    label?: string | null;
    objectiveRef?: string | null;
}

interface EvaluateDeliverablePayload {
    verdict: DeliverableVerdictEnum;
    comment?: string | null;
}

export type UploadDeliverableResult = {
    deliverable: SerializedMandateDeliverable;
    mandate: SerializedMandate;
    proposition: SerializedProposition;
};

export type EvaluateDeliverableResult = {
    deliverable: SerializedMandateDeliverable;
    mandate: SerializedMandate;
};

@inject()
export default class MandateDeliverableService {
    constructor(
        private readonly fileService: FileService,
        private readonly slugifyService: SlugifyService,
        private readonly workflowService: PropositionWorkflowService,
        private readonly automationService: DeliverableAutomationService,
        private readonly settingsService: SettingsService
    ) {}

    public async upload(proposition: Proposition, mandate: PropositionMandate, actor: User, payload: UploadDeliverablePayload, file: MultipartFile): Promise<UploadDeliverableResult> {
        logger.info('deliverable.service.upload.start');

        const canUpload = await this.workflowService.canPerform(proposition, actor, 'upload_deliverable');
        if (!canUpload) {
            throw new Error('forbidden:deliverables.upload');
        }

        logger.info('deliverable.service.upload.permission-check-passed');

        const trx = await db.transaction();
        let storedFile: File | null = null;

        try {
            logger.info('deliverable.service.upload.building-filename');
            const autoFilename = await this.buildAutoFilename(proposition, mandate, file.clientName ?? 'deliverable');
            const extension = path.extname(file.clientName ?? '').toLowerCase();
            const sanitizedFilename = `${autoFilename}${extension || ''}`;
            const key = this.buildStorageKey(proposition, mandate, sanitizedFilename);

            logger.info('deliverable.service.upload.storing-file', { key });
            const stored = await this.fileService.storeMultipartFile(file, key);
            logger.info('deliverable.service.upload.file-stored');

            logger.info('deliverable.service.upload.creating-file-record');
            storedFile = await File.create(
                {
                    name: sanitizedFilename,
                    path: key,
                    extension: extension || '',
                    mimeType: stored.mimeType ?? file.type ?? 'application/octet-stream',
                    size: stored.size,
                    type: FileTypeEnum.MANDATE_DELIVERABLE,
                },
                { client: trx }
            );

            logger.info('deliverable.service.upload.file-record-created');

            const label = typeof payload.label === 'string' && payload.label.length ? payload.label : undefined;
            const objectiveRef = typeof payload.objectiveRef === 'string' && payload.objectiveRef.length ? payload.objectiveRef : undefined;

            logger.info('deliverable.service.upload.creating-deliverable-record');
            const deliverable = await MandateDeliverable.create(
                {
                    mandateId: mandate.id,
                    fileId: storedFile.id,
                    uploadedByUserId: actor.id,
                    label,
                    objectiveRef,
                    autoFilename,
                    status: 'pending',
                    uploadedAt: DateTime.now(),
                    evaluationDeadlineSnapshot: proposition.evaluationDeadline ?? null,
                    metadata: {
                        status: 'pending',
                    },
                },
                { client: trx }
            );

            logger.info('deliverable.service.upload.deliverable-record-created');
            logger.info('deliverable.service.upload.running-automation');
            await this.automationService.handleDeliverableCreated(proposition, mandate, deliverable, actor, trx);
            logger.info('deliverable.service.upload.automation-completed');

            logger.info('deliverable.service.upload.committing-transaction');
            await trx.commit();
            logger.info('deliverable.service.upload.transaction-committed');

            logger.info('deliverable.service.upload.refreshing-models');
            await proposition.refresh();
            await proposition.load('creator');
            await deliverable.refresh();
            await mandate.refresh();
            logger.info('deliverable.service.upload.models-refreshed');

            logger.info('deliverable.service.upload.loading-deliverable-relations');
            await deliverable.load((loader) => {
                loader.preload('file');
                loader.preload('uploadedBy');
                loader.preload('evaluations', (evaluationQuery) => {
                    evaluationQuery.preload('evaluator');
                });
            });

            logger.info('deliverable.service.upload.loading-mandate-relations');
            await mandate.load((loader) => {
                loader
                    .preload('holder')
                    .preload('deliverables', (deliverableQuery) => {
                        deliverableQuery
                            .orderBy('uploaded_at', 'asc')
                            .preload('file')
                            .preload('uploadedBy')
                            .preload('evaluations', (evaluationQuery) => {
                                evaluationQuery.preload('evaluator');
                            });
                    })
                    .preload('applications', (applicationQuery) => {
                        applicationQuery.preload('applicant');
                    })
                    .preload('revocationRequests', (requestQuery) => {
                        requestQuery.preload('initiatedBy');
                    });
            });

            logger.info('deliverable.service.upload.serializing-data');

            logger.info('deliverable.service.upload.serializing-deliverable', {
                hasUploadedBy: !!deliverable.uploadedBy,
                uploadedByUserId: deliverable.uploadedByUserId,
                preloaded: Object.keys(deliverable.$preloaded || {}),
            });
            const serializedDeliverable = serializeMandateDeliverable(deliverable);

            logger.info('deliverable.service.upload.serializing-mandate');
            const serializedMandate = serializeMandate(mandate);

            logger.info('deliverable.service.upload.serializing-proposition');
            const serializedProposition = proposition.apiSerialize();

            logger.info('deliverable.service.upload.completed-successfully');
            return {
                deliverable: serializedDeliverable,
                mandate: serializedMandate,
                proposition: serializedProposition,
            };
        } catch (error) {
            await trx.rollback();

            if (storedFile) {
                try {
                    await this.fileService.delete(storedFile);
                } catch (cleanupError) {
                    logger.error('deliverable.upload.cleanup_failed', {
                        fileId: storedFile.id,
                        error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
                    });
                }
            }

            throw error;
        }
    }

    public async evaluate(
        proposition: Proposition,
        mandate: PropositionMandate,
        deliverable: MandateDeliverable,
        actor: User,
        payload: EvaluateDeliverablePayload
    ): Promise<EvaluateDeliverableResult> {
        const canEvaluate = await this.workflowService.canPerform(proposition, actor, 'evaluate_deliverable');
        if (!canEvaluate) {
            throw new Error('forbidden:deliverables.evaluate');
        }

        const trx = await db.transaction();

        try {
            deliverable.useTransaction(trx);

            const existingEvaluation = await deliverable.related('evaluations').query().useTransaction(trx).where('evaluator_user_id', actor.id).first();

            if (existingEvaluation) {
                existingEvaluation.merge({
                    verdict: payload.verdict,
                    comment: payload.comment ?? null,
                    recordedAt: DateTime.now(),
                });
                await existingEvaluation.save();
            } else {
                await DeliverableEvaluation.create(
                    {
                        deliverableId: deliverable.id,
                        evaluatorUserId: actor.id,
                        verdict: payload.verdict,
                        comment: payload.comment ?? null,
                        recordedAt: DateTime.now(),
                    },
                    { client: trx }
                );
            }

            await this.automationService.handleEvaluationRecorded(proposition, mandate, deliverable, actor, trx);

            await trx.commit();

            await deliverable.load((loader) => {
                loader.preload('file');
                loader.preload('uploadedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                    userQuery.select(['id', 'front_id', 'username']);
                });
                loader.preload('evaluations', (evaluationQuery) => {
                    evaluationQuery.preload('evaluator', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                        userQuery.select(['id', 'front_id', 'username']);
                    });
                });
            });

            await mandate.load((loader) => {
                loader
                    .preload('holder', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                        userQuery.select(['id', 'front_id', 'username']);
                    })
                    .preload('deliverables', (deliverableQuery) => {
                        deliverableQuery
                            .orderBy('uploaded_at', 'asc')
                            .preload('file')
                            .preload('uploadedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                                userQuery.select(['id', 'front_id', 'username']);
                            })
                            .preload('evaluations', (evaluationQuery) => {
                                evaluationQuery.preload('evaluator', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                                    userQuery.select(['id', 'front_id', 'username']);
                                });
                            });
                    })
                    .preload('applications', (applicationQuery) => {
                        applicationQuery.preload('applicant', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                            userQuery.select(['id', 'front_id', 'username']);
                        });
                    })
                    .preload('revocationRequests', (requestQuery) => {
                        requestQuery.preload('initiatedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                            userQuery.select(['id', 'front_id', 'username']);
                        });
                    });
            });

            return {
                deliverable: serializeMandateDeliverable(deliverable),
                mandate: serializeMandate(mandate),
            };
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    private async buildAutoFilename(proposition: Proposition, mandate: PropositionMandate, originalName: string): Promise<string> {
        const settings = await this.settingsService.getOrganizationSettings();
        const pattern = settings.workflowAutomation?.deliverableNamingPattern ?? 'DELIV-{proposition}-{date}-{id}';
        const slugProposition = this.slugifyService.slugify(proposition.title ?? 'proposition');
        const slugMandate = this.slugifyService.slugify(mandate.title ?? 'mandate');
        const date = DateTime.now();

        const replacements: Record<string, string> = {
            '{proposition}': slugProposition,
            '{mandate}': slugMandate,
            '{date}': date.toFormat('yyyyMMdd'),
            '{time}': date.toFormat('HHmmss'),
            '{id}': cuid(),
        };

        let filename = pattern;
        for (const [token, value] of Object.entries(replacements)) {
            filename = filename.replace(new RegExp(token, 'gi'), value);
        }

        const baseName = filename.trim().length ? filename.trim() : this.slugifyService.slugify(path.parse(originalName).name || 'deliverable');
        return baseName;
    }

    private buildStorageKey(proposition: Proposition, mandate: PropositionMandate, filename: string): string {
        const propositionId = proposition.id ?? cuid();
        const mandateId = mandate.id ?? cuid();
        return `propositions/${propositionId}/mandates/${mandateId}/${filename}`;
    }
}
