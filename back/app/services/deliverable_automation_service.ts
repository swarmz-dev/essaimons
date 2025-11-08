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
import { DeliverableVerdictEnum, MandateRevocationStatusEnum, MandateStatusEnum, PropositionStatusEnum, PropositionVoteMethodEnum, PropositionVotePhaseEnum, PropositionVoteStatusEnum } from '#types';

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

interface WorkflowAutomationSettings {
    deliverableRecalcCooldownMinutes?: number;
    evaluationAutoShiftDays?: number;
    nonConformityPercentThreshold?: number;
    nonConformityAbsoluteFloor?: number;
    revocationAutoTriggerDelayDays?: number;
    revocationCheckFrequencyHours?: number;
}

interface RecalculateOptions {
    deliverable?: MandateDeliverable;
    actor?: User;
    trx?: TransactionClientContract;
    reason: 'upload' | 'late_detection';
}

@inject()
export default class DeliverableAutomationService {
    constructor(private readonly settingsService: SettingsService) {}

    public getRevocationSweepIntervalMs(workflowFrequencyHours: number): number {
        const hours = Math.max(1, workflowFrequencyHours);
        return hours * 60 * 60 * 1000;
    }

    public async handleDeliverableCreated(proposition: Proposition, mandate: PropositionMandate, deliverable: MandateDeliverable, actor: User, trx?: TransactionClientContract): Promise<void> {
        logger.info('automation.handleDeliverableCreated.start');
        const settings = await this.settingsService.getOrganizationSettings();
        logger.info('automation.handleDeliverableCreated.settings-loaded');
        const automation = settings.workflowAutomation;
        const now = DateTime.now();
        const cooldownMinutes = Math.max(automation?.deliverableRecalcCooldownMinutes ?? 10, 0);

        if (this.shouldThrottleAutomation(mandate, cooldownMinutes, now)) {
            logger.info('automation.handleDeliverableCreated.throttled');
            return;
        }

        logger.info('automation.handleDeliverableCreated.recalculating-deadlines');
        await this.recalculateDeadlines(proposition, mandate, automation ?? {}, now, {
            deliverable,
            actor,
            trx,
            reason: 'upload',
        });
        logger.info('automation.handleDeliverableCreated.completed');
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
            query.preload('evaluator', (userQuery) => userQuery.select(['id', 'username', 'profile_picture_id']));
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
                openedAt: this.ensureIsoString(now),
            };
        }

        deliverableMetadata.status = 'non_conform';
        deliverableMetadata.lastRecalculatedAt = deliverableMetadata.lastRecalculatedAt ?? this.ensureIsoString(now);

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
            openedAt: this.ensureIsoString(deliverableMetadata.procedure.openedAt),
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

    public async runDeadlineSweep(): Promise<{ deadlinesChecked: number; deadlinesShifted: number; failures: number }> {
        const settings = await this.settingsService.getOrganizationSettings();
        const automation = settings.workflowAutomation ?? {};
        const evaluationShift = automation.evaluationAutoShiftDays ?? 0;

        if (evaluationShift <= 0) {
            return { deadlinesChecked: 0, deadlinesShifted: 0, failures: 0 };
        }

        const now = DateTime.now();
        const cooldownMinutes = Math.max(automation.deliverableRecalcCooldownMinutes ?? 10, 0);
        const thresholdSql = now.toSQL();

        const mandates = await PropositionMandate.query()
            .whereIn('status', [MandateStatusEnum.ACTIVE, MandateStatusEnum.TO_ASSIGN])
            .whereHas('proposition', (builder) => {
                builder.where('status', PropositionStatusEnum.EVALUATE).whereNotNull('evaluation_deadline');
                if (thresholdSql) {
                    builder.where('evaluation_deadline', '<=', thresholdSql);
                }
            })
            .preload('proposition');

        let deadlinesChecked = 0;
        let deadlinesShifted = 0;
        let failures = 0;

        for (const mandate of mandates) {
            try {
                const proposition = mandate.proposition as Proposition | undefined;
                if (!proposition?.evaluationDeadline) {
                    continue;
                }

                deadlinesChecked++;

                const tickNow = DateTime.now();

                if (this.shouldThrottleAutomation(mandate, cooldownMinutes, tickNow)) {
                    continue;
                }

                await this.recalculateDeadlines(proposition, mandate, automation, tickNow, {
                    reason: 'late_detection',
                });
                deadlinesShifted++;
            } catch (error) {
                failures++;
                logger.error('automation.deadline.sweep.error', {
                    mandateId: mandate.id,
                    propositionId: mandate.propositionId,
                    error: error instanceof Error ? error.message : error,
                });
            }
        }

        return { deadlinesChecked, deadlinesShifted, failures };
    }

    public async runRevocationSweep(): Promise<{ deliverablesChecked: number; revocationsEscalated: number; failures: number }> {
        const settings = await this.settingsService.getOrganizationSettings();
        const automation = settings.workflowAutomation;
        const delayDays = automation.revocationAutoTriggerDelayDays ?? 0;
        if (delayDays <= 0) {
            return { deliverablesChecked: 0, revocationsEscalated: 0, failures: 0 };
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

        let deliverablesChecked = 0;
        let revocationsEscalated = 0;
        let failures = 0;

        for (const deliverable of deliverables) {
            try {
                const mandate = deliverable.mandate as PropositionMandate | undefined;
                const proposition = mandate?.proposition as Proposition | undefined;
                if (!mandate || !proposition) {
                    continue;
                }

                deliverablesChecked++;

                const deliverableMetadata = this.getDeliverableMetadata(deliverable);
                if (!deliverableMetadata.procedure || deliverableMetadata.procedure.status === 'escalated' || deliverableMetadata.procedure.status === 'resolved') {
                    continue;
                }

                await this.escalateToRevocationVote(proposition, mandate, deliverable, deliverableMetadata, now);
                revocationsEscalated++;
            } catch (error) {
                failures++;
                logger.error('automation.revocation.sweep.error', {
                    deliverableId: deliverable.id,
                    mandateId: deliverable.mandateId,
                    error: error instanceof Error ? error.message : error,
                });
            }
        }

        return { deliverablesChecked, revocationsEscalated, failures };
    }

    private toIsoString(date: DateTime): string {
        return date.toISO() ?? date.toUTC().toISO() ?? date.toFormat("yyyy-MM-dd'T'HH:mm:ss");
    }

    private ensureIsoString(value: string | DateTime | null | undefined): string {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
        if (value instanceof DateTime) {
            return this.toIsoString(value);
        }
        return this.toIsoString(DateTime.now());
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

    private shouldThrottleAutomation(mandate: PropositionMandate, cooldownMinutes: number, now: DateTime): boolean {
        if (cooldownMinutes <= 0) {
            return false;
        }

        if (!mandate.lastAutomationRunAt) {
            return false;
        }

        const diff = now.diff(mandate.lastAutomationRunAt, 'minutes').minutes;
        return diff < cooldownMinutes;
    }

    private async recalculateDeadlines(proposition: Proposition, mandate: PropositionMandate, automation: WorkflowAutomationSettings, now: DateTime, options: RecalculateOptions): Promise<void> {
        const trx = options.trx;

        if (trx) {
            proposition.useTransaction(trx);
            mandate.useTransaction(trx);
            options.deliverable?.useTransaction(trx);
        }

        const evaluationShift = automation.evaluationAutoShiftDays ?? 0;
        const mandateMetadata = this.getMandateMetadata(mandate);
        const previousMandateDeadline = proposition.mandateDeadline ?? mandate.currentDeadline ?? now;
        const previousEvaluationDeadline = proposition.evaluationDeadline ?? previousMandateDeadline.plus({ days: evaluationShift });
        const isLate = previousEvaluationDeadline ? now > previousEvaluationDeadline : false;

        if (isLate) {
            mandateMetadata.deadlineHistory.push({
                mandateDeadline: this.ensureIsoString(previousMandateDeadline),
                evaluationDeadline: this.ensureIsoString(previousEvaluationDeadline),
                status: 'missed',
                recalculatedAt: this.ensureIsoString(now),
            });
        }

        const pivot = isLate ? now : (previousEvaluationDeadline ?? now);
        const nextMandateDeadline = pivot.plus({ days: evaluationShift });
        const nextEvaluationDeadline = nextMandateDeadline.plus({ days: evaluationShift });

        mandateMetadata.deadlineHistory.push({
            mandateDeadline: this.ensureIsoString(nextMandateDeadline),
            evaluationDeadline: this.ensureIsoString(nextEvaluationDeadline),
            status: 'scheduled',
            recalculatedAt: this.ensureIsoString(now),
        });

        proposition.mandateDeadline = nextMandateDeadline;
        proposition.evaluationDeadline = nextEvaluationDeadline;
        await proposition.save();

        const previousAutomationRunAt = mandate.lastAutomationRunAt ?? null;

        mandate.currentDeadline = nextMandateDeadline;
        mandate.lastAutomationRunAt = now;
        mandate.metadata = mandateMetadata;
        await mandate.save();

        const deliverable = options.deliverable;
        if (deliverable) {
            const deliverableMetadata = this.getDeliverableMetadata(deliverable);
            deliverableMetadata.status = deliverable.status ?? deliverableMetadata.status ?? 'pending';
            deliverableMetadata.lastRecalculatedAt = this.ensureIsoString(now);
            deliverable.metadata = deliverableMetadata;
            deliverable.evaluationDeadlineSnapshot = nextEvaluationDeadline;
            await deliverable.save();
        }

        logger.info('automation.deliverable.recalculated', {
            propositionId: proposition.id,
            mandateId: mandate.id,
            deliverableId: deliverable?.id ?? null,
            nextMandateDeadline: this.ensureIsoString(nextMandateDeadline),
            nextEvaluationDeadline: this.ensureIsoString(nextEvaluationDeadline),
            actorId: options.actor?.id ?? null,
            reason: options.reason,
            previousAutomationRunAt: previousAutomationRunAt ? this.ensureIsoString(previousAutomationRunAt) : null,
        });
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
            openedAt: this.ensureIsoString(deliverableMetadata.procedure?.openedAt ?? now),
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

            const procedure: DeliverableProcedureMetadata = deliverableMetadata.procedure ?? {
                status: 'pending',
                openedAt: this.ensureIsoString(deliverable.nonConformityFlaggedAt ?? now),
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
            procedure.escalatedAt = this.ensureIsoString(now);
            procedure.revocationVoteId = vote.id;
            deliverable.status = 'escalated';
            deliverableMetadata.status = 'escalated';
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
