import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import { DateTime } from 'luxon';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import User from '#models/user';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { MandateStatusEnum } from '#types/enum/mandate_status_enum';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import type { SerializedMandate } from '#types';
import { serializeMandate } from '#serializers/mandate_serializer';
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
                        userQuery.select(['id', 'front_id', 'username']);
                    })
                    .preload('evaluations', (evaluationQuery) => {
                        evaluationQuery.preload('evaluator', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                            userQuery.select(['id', 'front_id', 'username']);
                        });
                    });
            })
            .preload('applications', (query) => {
                query.preload('applicant', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                    userQuery.select(['id', 'front_id', 'username']);
                });
            })
            .preload('revocationRequests', (query) => {
                query
                    .preload('initiatedBy', (userQuery: ModelQueryBuilderContract<typeof User>) => {
                        userQuery.select(['id', 'front_id', 'username']);
                    })
                    .preload('vote');
            })
            .orderBy('created_at', 'asc');

        return mandates.map((mandate: PropositionMandate): SerializedMandate => serializeMandate(mandate));
    }

    public async create(proposition: Proposition, actor: User, payload: MandatePayload): Promise<PropositionMandate> {
        await this.ensureCanManageMandates(proposition, actor);

        const normalized = await this.normalizePayload(payload);
        const mandate = await PropositionMandate.create({
            propositionId: proposition.id,
            status: normalized.status ?? MandateStatusEnum.TO_ASSIGN,
            title: normalized.title,
            description: normalized.description ?? null,
            holderUserId: normalized.holderUserId ?? null,
            targetObjectiveRef: normalized.targetObjectiveRef ?? null,
            initialDeadline: normalized.initialDeadline,
            currentDeadline: normalized.currentDeadline,
        });

        await mandate.load('holder', (query: ModelQueryBuilderContract<typeof User>) => {
            query.select(['id', 'front_id', 'username', 'profile_picture_id']);
        });

        return mandate;
    }

    public async update(proposition: Proposition, mandate: PropositionMandate, actor: User, payload: UpdateMandatePayload): Promise<PropositionMandate> {
        await this.ensureCanManageMandates(proposition, actor);

        const normalized = await this.normalizePayload(payload);
        const updateData: Partial<PropositionMandate> = {};
        if (normalized.title !== undefined) {
            updateData.title = normalized.title;
        }
        if (normalized.description !== undefined) {
            updateData.description = normalized.description;
        }
        if (normalized.holderUserId !== undefined) {
            updateData.holderUserId = normalized.holderUserId;
        }
        if (normalized.status !== undefined) {
            updateData.status = normalized.status;
        }
        if (normalized.targetObjectiveRef !== undefined) {
            updateData.targetObjectiveRef = normalized.targetObjectiveRef;
        }
        if (normalized.initialDeadline !== undefined) {
            updateData.initialDeadline = normalized.initialDeadline;
        }
        if (normalized.currentDeadline !== undefined) {
            updateData.currentDeadline = normalized.currentDeadline;
        }

        mandate.merge(updateData);
        await mandate.save();

        await mandate.load('holder', (query: ModelQueryBuilderContract<typeof User>) => {
            query.select(['id', 'front_id', 'username', 'profile_picture_id']);
        });

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

    private async normalizePayload<T extends MandatePayload | UpdateMandatePayload>(payload: T): Promise<any> {
        const parseDate = (value?: string | null) => {
            if (!value) return null;
            const parsed = DateTime.fromISO(value);
            if (!parsed.isValid) {
                throw new Error('invalid-date');
            }
            return parsed;
        };

        const hasHolder = Object.prototype.hasOwnProperty.call(payload, 'holderUserId');
        let resolvedHolder: string | null | undefined = undefined;
        if (hasHolder) {
            resolvedHolder = await this.resolveHolderId(payload.holderUserId ?? null);
        }

        return {
            ...payload,
            holderUserId: resolvedHolder,
            initialDeadline: payload.initialDeadline !== undefined ? parseDate(payload.initialDeadline) : undefined,
            currentDeadline: payload.currentDeadline !== undefined ? parseDate(payload.currentDeadline) : undefined,
        };
    }

    private async resolveHolderId(raw: string | null | undefined): Promise<string | null> {
        const trimmed = raw?.toString().trim();
        if (!trimmed) {
            return null;
        }

        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) {
            const user = await User.query().where('front_id', Math.floor(numeric)).first();
            if (!user) {
                throw new Error('invalid-holder');
            }
            return user.id;
        }

        const user = await User.find(trimmed);
        if (!user) {
            throw new Error('invalid-holder');
        }
        return user.id;
    }
}
