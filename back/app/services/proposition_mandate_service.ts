import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import type User from '#models/user';
import { MandateStatusEnum } from '#types/enum/mandate_status_enum';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import type { SerializedMandate } from '#types';
import { serializeMandate } from '#serializers/mandate_serializer';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';

interface MandatePayload {
    title: string;
    description?: string | null;
    holderUserId?: string | null;
    status?: MandateStatusEnum;
    targetObjectiveRef?: string | null;
    initialDeadline?: string | null;
    currentDeadline?: string | null;
}

interface UpdateMandatePayload extends Partial<MandatePayload> {}

@inject()
export default class PropositionMandateService {
    constructor(private readonly workflowService: PropositionWorkflowService) {}

    public async list(proposition: Proposition): Promise<SerializedMandate[]> {
        const mandates = await proposition
            .related('mandates')
            .query()
            .preload('holder', (query: ModelQueryBuilderContract<typeof User>) => {
                query.select(['id', 'front_id', 'username', 'profile_picture_id']);
            })
            .preload('deliverables', (query) => {
                query
                    .orderBy('uploaded_at', 'asc')
                    .preload('file')
                    .preload('uploadedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                        userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']);
                    })
                    .preload('evaluations', (evaluationQuery) => {
                        evaluationQuery.preload('evaluator', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                            userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']);
                        });
                    });
            })
            .preload('applications', (query) => {
                query.preload('applicant', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                    userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']);
                });
            })
            .preload('revocationRequests', (query) => {
                query
                    .preload('initiatedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                        userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']);
                    })
                    .preload('vote');
            })
            .orderBy('created_at', 'asc');

        return mandates.map((mandate: PropositionMandate): SerializedMandate => serializeMandate(mandate));
    }

    public async create(proposition: Proposition, actor: User, payload: MandatePayload): Promise<PropositionMandate> {
        await this.ensureCanManageMandates(proposition, actor);

        const normalized = this.normalizePayload(payload);
        const mandate = await PropositionMandate.create({
            propositionId: proposition.id,
            status: normalized.status ?? MandateStatusEnum.DRAFT,
            title: normalized.title,
            description: normalized.description ?? null,
            holderUserId: normalized.holderUserId ?? null,
            targetObjectiveRef: normalized.targetObjectiveRef ?? null,
            initialDeadline: normalized.initialDeadline,
            currentDeadline: normalized.currentDeadline,
        });

        return mandate;
    }

    public async update(proposition: Proposition, mandate: PropositionMandate, actor: User, payload: UpdateMandatePayload): Promise<PropositionMandate> {
        await this.ensureCanManageMandates(proposition, actor);

        const normalized = this.normalizePayload(payload);
        mandate.merge({
            title: normalized.title ?? mandate.title,
            description: normalized.description ?? mandate.description,
            holderUserId: normalized.holderUserId ?? mandate.holderUserId,
            status: normalized.status ?? mandate.status,
            targetObjectiveRef: normalized.targetObjectiveRef ?? mandate.targetObjectiveRef,
            initialDeadline: normalized.initialDeadline ?? mandate.initialDeadline,
            currentDeadline: normalized.currentDeadline ?? mandate.currentDeadline,
        });
        await mandate.save();
        return mandate;
    }

    public async delete(proposition: Proposition, mandate: PropositionMandate, actor: User): Promise<void> {
        await this.ensureCanManageMandates(proposition, actor);
        const trx: TransactionClientContract = await db.transaction();

        try {
            mandate.useTransaction(trx);
            await mandate.related('deliverables').query().useTransaction(trx).delete();
            await mandate.related('applications').query().useTransaction(trx).delete();
            await mandate.related('revocationRequests').query().useTransaction(trx).delete();
            await mandate.delete();
            await trx.commit();
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    private async ensureCanManageMandates(proposition: Proposition, actor: User): Promise<void> {
        const allowed = await this.workflowService.canPerform(proposition, actor, 'manage_mandates');
        if (!allowed) {
            throw new Error('forbidden:mandates');
        }
    }

    private normalizePayload<T extends MandatePayload | UpdateMandatePayload>(payload: T): any {
        const parseDate = (value?: string | null) => {
            if (!value) return null;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                throw new Error('invalid-date');
            }
            return parsed;
        };

        return {
            ...payload,
            initialDeadline: payload.initialDeadline !== undefined ? parseDate(payload.initialDeadline) : undefined,
            currentDeadline: payload.currentDeadline !== undefined ? parseDate(payload.currentDeadline) : undefined,
        };
    }
}
