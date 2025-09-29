import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import logger from '@adonisjs/core/services/logger';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverable from '#models/mandate_deliverable';
import DeliverableEvaluation from '#models/deliverable_evaluation';
import MandateRevocationRequest from '#models/mandate_revocation_request';
import PropositionVote from '#models/proposition_vote';
import VoteOption from '#models/vote_option';
import type User from '#models/user';
import SettingsService from '#services/settings_service';
import { DeliverableVerdictEnum, MandateRevocationStatusEnum, PropositionVoteMethodEnum, PropositionVotePhaseEnum, PropositionVoteStatusEnum } from '#types';

interface MandateAutomationHistoryEntry {
    mandateDeadline: string;
    evaluationDeadline: string;
    status: 'scheduled' | 'missed';
    recalculatedAt: string;
}

interface MandateAutomationMetadata {
    deadlineHistory: MandateAutomationHistoryEntry[];
    procedures: Record<
        string,
        {
            status: 'pending' | 'escalated' | 'resolved';
            openedAt?: string;
            escalatedAt?: string;
            revocationRequestId?: string;
            revocationVoteId?: string;
        }
    >;
    [key: string]: unknown;
}

interface DeliverableProcedureMetadata {
    status: 'pending' | 'escalated' | 'resolved';
    openedAt: string;
    escalatedAt?: string;
    revocationRequestId?: string;
    revocationVoteId?: string;
}

interface DeliverableMetadata {
    status?: string;
    lastRecalculatedAt?: string;
    procedure?: DeliverableProcedureMetadata;
    [key: string]: unknown;
}

@inject()
export default class DeliverableAutomationService {
    constructor(private readonly settingsService: SettingsService) {}

    public getRevocationSweepIntervalMs(workflowFrequencyHours: number): number {
        const hours = Math.max(1, workflowFrequencyHours);
        return hours * 60 * 60 * 1000;
    }

    public async handleDeliverableCreated(proposition: Proposition, mandate: PropositionMandate, deliverable: MandateDeliverable, actor: User, trx?: TransactionClientContract): Promise<void> {
        const settings = await this.settingsService.getOrganizationSettings();
        const automation = settings.workflowAutomation;
        const now = DateTime.now();
        const cooldownMinutes = automation.deliverableRecalcCooldownMinutes ?? 10;

        if (mandate.lastAutomationRunAt) {
            const diff = now.diff(mandate.lastAutomationRunAt, 'minutes').minutes;
            if (diff < cooldownMinutes) {
                return;
            }
        }

        if (trx) {
            proposition.useTransaction(trx);
            mandate.useTransaction(trx);
            deliverable.useTransaction(trx);
        }

        const evaluationShift = automation.evaluationAutoShiftDays ?? 0;
        const mandateMetadata = this.getMandateMetadata(mandate);
        const previousMandateDeadline = proposition.mandateDeadline ?? mandate.currentDeadline ?? now;
        const previousEvaluationDeadline = proposition.evaluationDeadline ?? previousMandateDeadline.plus({ days: evaluationShift });
        const isLate = previousEvaluationDeadline ? now > previousEvaluationDeadline : false;

        if (isLate) {
            mandateMetadata.deadlineHistory.push({
                mandateDeadline: previousMandateDeadline.toISO(),
                evaluationDeadline: previousEvaluationDeadline.toISO(),
                status: 'missed',
                recalculatedAt: now.toISO(),
            });
        }

        const base = isLate ? now : (previousEvaluationDeadline ?? now);
        const nextMandateDeadline = base.plus({ days: evaluationShift });
        const nextEvaluationDeadline = nextMandateDeadline.plus({ days: evaluationShift });

        mandateMetadata.deadlineHistory.push({
            mandateDeadline: nextMandateDeadline.toISO(),
            evaluationDeadline: nextEvaluationDeadline.toISO(),
            status: 'scheduled',
            recalculatedAt: now.toISO(),
        });

        proposition.mandateDeadline = nextMandateDeadline;
        proposition.evaluationDeadline = nextEvaluationDeadline;
        await proposition.save();

        mandate.currentDeadline = nextMandateDeadline;
        mandate.lastAutomationRunAt = now;
        mandate.metadata = mandateMetadata;
        await mandate.save();

        const deliverableMetadata = this.getDeliverableMetadata(deliverable);
        deliverableMetadata.status = deliverableMetadata.status ?? 'pending';
        deliverableMetadata.lastRecalculatedAt = now.toISO();
        deliverable.metadata = deliverableMetadata;
        deliverable.evaluationDeadlineSnapshot = nextEvaluationDeadline;
        await deliverable.save();

        logger.info('automation.deliverable.recalculated', {
            propositionId: proposition.id,
            mandateId: mandate.id,
            deliverableId: deliverable.id,
            nextMandateDeadline: nextMandateDeadline.toISO(),
            nextEvaluationDeadline: nextEvaluationDeadline.toISO(),
            actorId: actor.id,
        });
    }

    public async handleEvaluationRecorded(proposition: Proposition, mandate: PropositionMandate, deliverable: MandateDeliverable, actor: User, trx?: TransactionClientContract): Promise<void> {
        const settings = await this.settingsService.getOrganizationSettings();
        const automation = settings.workflowAutomation;

        if (trx) {
            proposition.useTransaction(trx);
            mandate.useTransaction(trx);
            deliverable.useTransaction(trx);
        }

        await deliverable.load('evaluations', (query) => {
            query.preload('evaluator', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']));
        });

        const evaluations = deliverable.evaluations ?? [];
        const totalVotes = evaluations.length;
        const nonConformVotes = evaluations.filter((evaluation: DeliverableEvaluation) => evaluation.verdict === DeliverableVerdictEnum.NON_COMPLIANT).length;

        if (totalVotes === 0) {
            return;
        }

        const meetsPercent = automation.nonConformityPercentThreshold ? (nonConformVotes / totalVotes) * 100 >= automation.nonConformityPercentThreshold : false;
        const meetsFloor = automation.nonConformityAbsoluteFloor ? nonConformVotes >= automation.nonConformityAbsoluteFloor : false;

        if (!meetsPercent && !meetsFloor) {
            return;
        }

        const now = DateTime.now();
        const deliverableMetadata = this.getDeliverableMetadata(deliverable);
        if (!deliverableMetadata.procedure) {
            deliverableMetadata.procedure = {
                status: 'pending',
                openedAt: now.toISO(),
            };
        }

        if (deliverable.status !== 'non_conform') {
            deliverable.status = 'non_conform';
            deliverable.nonConformityFlaggedAt = now;
        }

        deliverable.metadata = deliverableMetadata;
        await deliverable.save();

        await this.ensureRevocationRequest(proposition, mandate, deliverable, actor, deliverableMetadata, now, trx);

        await mandate.refresh();
        const mandateMetadata = this.getMandateMetadata(mandate);
        mandateMetadata.procedures[deliverable.id] = {
            status: deliverableMetadata.procedure.status,
            openedAt: deliverableMetadata.procedure.openedAt,
            revocationRequestId: deliverableMetadata.procedure.revocationRequestId,
            revocationVoteId: deliverableMetadata.procedure.revocationVoteId,
        };
        mandate.metadata = mandateMetadata;
        await mandate.save();

        logger.info('automation.deliverable.non_conformity_triggered', {
            propositionId: proposition.id,
            mandateId: mandate.id,
            deliverableId: deliverable.id,
            totalVotes,
            nonConformVotes,
            actorId: actor.id,
        });
    }

    public async runRevocationSweep(): Promise<void> {
        const settings = await this.settingsService.getOrganizationSettings();
        const automation = settings.workflowAutomation;
        const delayDays = automation.revocationAutoTriggerDelayDays ?? 0;
        if (delayDays <= 0) {
            return;
        }

        const now = DateTime.now();
        const threshold = now.minus({ days: delayDays });

        const deliverables = await MandateDeliverable.query()
            .where('status', 'non_conform')
            .whereNotNull('non_conformity_flagged_at')
            .where('non_conformity_flagged_at', '<=', threshold.toSQL())
            .preload('mandate', (mandateQuery) => {
                mandateQuery.preload('proposition').preload('revocationRequests').preload('deliverables');
            });

        for (const deliverable of deliverables) {
            try {
                const mandate = deliverable.mandate as PropositionMandate | undefined;
                const proposition = mandate?.proposition as Proposition | undefined;
                if (!mandate || !proposition) {
                    continue;
                }

                const deliverableMetadata = this.getDeliverableMetadata(deliverable);
                if (!deliverableMetadata.procedure || deliverableMetadata.procedure.status === 'escalated' || deliverableMetadata.procedure.status === 'resolved') {
                    continue;
                }

                await this.escalateToRevocationVote(proposition, mandate, deliverable, deliverableMetadata, now);
            } catch (error) {
                logger.error('automation.revocation.sweep.error', {
                    deliverableId: deliverable.id,
                    mandateId: deliverable.mandateId,
                    error: error instanceof Error ? error.message : error,
                });
            }
        }
    }

    private getMandateMetadata(mandate: PropositionMandate): MandateAutomationMetadata {
        const raw = (mandate.metadata ?? {}) as MandateAutomationMetadata;
        const history = Array.isArray(raw.deadlineHistory) ? raw.deadlineHistory : [];
        const procedures = raw.procedures && typeof raw.procedures === 'object' ? raw.procedures : {};
        return {
            ...raw,
            deadlineHistory: history,
            procedures,
        };
    }

    private getDeliverableMetadata(deliverable: MandateDeliverable): DeliverableMetadata {
        const raw = (deliverable.metadata ?? {}) as DeliverableMetadata;
        const procedure = raw.procedure && typeof raw.procedure === 'object' ? raw.procedure : undefined;
        return {
            ...raw,
            procedure,
        };
    }

    private async ensureRevocationRequest(
        proposition: Proposition,
        mandate: PropositionMandate,
        deliverable: MandateDeliverable,
        actor: User,
        deliverableMetadata: DeliverableMetadata,
        now: DateTime,
        trx?: TransactionClientContract
    ): Promise<void> {
        if (deliverableMetadata.procedure?.revocationRequestId) {
            return;
        }

        const initiatorId = actor?.id ?? proposition.creatorId ?? mandate.holderUserId;
        if (!initiatorId) {
            return;
        }

        const request = await MandateRevocationRequest.create(
            {
                mandateId: mandate.id,
                initiatedByUserId: initiatorId,
                reason: `Automatic trigger after non-conform deliverable ${deliverable.id}`,
                status: MandateRevocationStatusEnum.PENDING,
            },
            trx ? { client: trx } : undefined
        );

        deliverableMetadata.procedure = {
            status: 'pending',
            openedAt: deliverableMetadata.procedure?.openedAt ?? now.toISO(),
            revocationRequestId: request.id,
        };
        deliverable.metadata = deliverableMetadata;
        await deliverable.save();
    }

    private async escalateToRevocationVote(
        proposition: Proposition,
        mandate: PropositionMandate,
        deliverable: MandateDeliverable,
        deliverableMetadata: DeliverableMetadata,
        now: DateTime
    ): Promise<void> {
        const trx = await db.transaction();

        try {
            proposition.useTransaction(trx);
            mandate.useTransaction(trx);
            deliverable.useTransaction(trx);

            const procedure = deliverableMetadata.procedure ?? {
                status: 'pending',
                openedAt: deliverable.nonConformityFlaggedAt?.toISO() ?? now.toISO(),
            };

            let request: MandateRevocationRequest | null = null;
            if (procedure.revocationRequestId) {
                request = await MandateRevocationRequest.query({ client: trx }).where('id', procedure.revocationRequestId).first();
            }

            if (!request) {
                request = await MandateRevocationRequest.create(
                    {
                        mandateId: mandate.id,
                        initiatedByUserId: proposition.creatorId ?? mandate.holderUserId ?? proposition.creatorId,
                        reason: `Automatic escalated revocation for deliverable ${deliverable.id}`,
                        status: MandateRevocationStatusEnum.PENDING,
                    },
                    { client: trx }
                );
                procedure.revocationRequestId = request.id;
            }

            if (request.status === MandateRevocationStatusEnum.VOTING && request.voteId) {
                await trx.commit();
                return;
            }

            const vote = await PropositionVote.create(
                {
                    propositionId: proposition.id,
                    phase: PropositionVotePhaseEnum.REVOCATION,
                    method: PropositionVoteMethodEnum.BINARY,
                    title: `Révocation du mandat ${mandate.title}`,
                    description: `Vote automatique déclenché suite à la non-conformité du livrable ${deliverable.id}`,
                    openAt: now,
                    closeAt: now.plus({ days: 3 }),
                    status: PropositionVoteStatusEnum.SCHEDULED,
                    metadata: {
                        source: 'automation',
                        deliverableId: deliverable.id,
                        mandateId: mandate.id,
                    },
                },
                { client: trx }
            );

            await VoteOption.createMany(
                [
                    {
                        voteId: vote.id,
                        label: 'Révoquer le mandat',
                        description: null,
                        position: 0,
                        metadata: { key: 'revoke' },
                    },
                    {
                        voteId: vote.id,
                        label: 'Maintenir le mandat',
                        description: null,
                        position: 1,
                        metadata: { key: 'keep' },
                    },
                ],
                { client: trx }
            );

            request.useTransaction(trx);
            request.status = MandateRevocationStatusEnum.VOTING;
            request.voteId = vote.id;
            request.updatedAt = now;
            await request.save();

            procedure.status = 'escalated';
            procedure.escalatedAt = now.toISO();
            procedure.revocationVoteId = vote.id;
            deliverableMetadata.procedure = procedure;
            deliverable.metadata = deliverableMetadata;
            await deliverable.save();

            const mandateMetadata = this.getMandateMetadata(mandate);
            mandateMetadata.procedures[deliverable.id] = {
                status: procedure.status,
                openedAt: procedure.openedAt,
                escalatedAt: procedure.escalatedAt,
                revocationRequestId: procedure.revocationRequestId,
                revocationVoteId: procedure.revocationVoteId,
            };
            mandate.metadata = mandateMetadata;
            await mandate.save();

            await trx.commit();

            logger.info('automation.revocation.vote_scheduled', {
                propositionId: proposition.id,
                mandateId: mandate.id,
                deliverableId: deliverable.id,
                voteId: vote.id,
            });
        } catch (error) {
            await trx.rollback();
            logger.error('automation.revocation.escalation_error', {
                deliverableId: deliverable.id,
                mandateId: deliverable.mandateId,
                error: error instanceof Error ? error.message : error,
            });
        }
    }
}
