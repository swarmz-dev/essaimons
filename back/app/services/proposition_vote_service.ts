import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import Proposition from '#models/proposition';
import PropositionVote from '#models/proposition_vote';
import VoteOption from '#models/vote_option';
import type User from '#models/user';
import { DateTime } from 'luxon';
import { PropositionVoteMethodEnum, PropositionVotePhaseEnum, PropositionVoteStatusEnum } from '#types';
import PropositionWorkflowService from '#services/proposition_workflow_service';

interface VoteOptionPayload {
    label: string;
    description?: string | null;
    position?: number | null;
    metadata?: Record<string, unknown>;
}

interface CreateVotePayload {
    phase: PropositionVotePhaseEnum;
    method: PropositionVoteMethodEnum;
    title: string;
    description?: string | null;
    openAt?: string | null;
    closeAt?: string | null;
    maxSelections?: number | null;
    metadata?: Record<string, unknown>;
    options: VoteOptionPayload[];
}

interface UpdateVotePayload extends Partial<CreateVotePayload> {}

@inject()
export default class PropositionVoteService {
    constructor(private readonly workflowService: PropositionWorkflowService) {}

    public async list(proposition: Proposition): Promise<PropositionVote[]> {
        const votes = await proposition.related('votes').query().preload('options').orderBy('created_at', 'asc');

        // Automatic update of vote status based on dates
        const now = DateTime.now();
        let hasChanges = false;

        for (const vote of votes) {
            let newStatus: PropositionVoteStatusEnum | null = null;

            // If scheduled and opening date has passed -> switch to open
            if (vote.status === PropositionVoteStatusEnum.SCHEDULED && vote.openAt && vote.openAt <= now) {
                newStatus = PropositionVoteStatusEnum.OPEN;
            }

            // If open and closing date has passed -> switch to closed
            if (vote.status === PropositionVoteStatusEnum.OPEN && vote.closeAt && vote.closeAt <= now) {
                newStatus = PropositionVoteStatusEnum.CLOSED;
            }

            if (newStatus) {
                vote.status = newStatus;
                await vote.save();
                hasChanges = true;
            }
        }

        // Reload votes if changes were made
        if (hasChanges) {
            return await proposition.related('votes').query().preload('options').orderBy('created_at', 'asc');
        }

        return votes;
    }

    public async create(proposition: Proposition, actor: User, payload: CreateVotePayload): Promise<PropositionVote> {
        await this.ensureCanManageVotes(proposition, actor);

        if (!payload.options || payload.options.length === 0) {
            throw new Error('votes.options.required');
        }

        const trx = await db.transaction();

        try {
            const vote = await PropositionVote.create(
                {
                    propositionId: proposition.id,
                    phase: payload.phase,
                    method: payload.method,
                    title: payload.title,
                    description: payload.description ?? null,
                    openAt: payload.openAt ? this.normalizeDate(payload.openAt) : null,
                    closeAt: payload.closeAt ? this.normalizeDate(payload.closeAt) : null,
                    maxSelections: payload.maxSelections ?? null,
                    status: PropositionVoteStatusEnum.DRAFT,
                    metadata: payload.metadata ?? {},
                },
                { client: trx }
            );

            await this.syncOptions(vote, payload.options, trx);

            await trx.commit();

            await vote.load('options');
            return vote;
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    public async update(proposition: Proposition, vote: PropositionVote, actor: User, payload: UpdateVotePayload): Promise<PropositionVote> {
        await this.ensureCanManageVotes(proposition, actor);

        // Only admins can modify published votes
        if (vote.status !== PropositionVoteStatusEnum.DRAFT && actor.role !== 'admin') {
            throw new Error('votes.update.locked');
        }

        const trx = await db.transaction();

        try {
            vote.useTransaction(trx);
            vote.merge({
                phase: payload.phase ?? vote.phase,
                method: payload.method ?? vote.method,
                title: payload.title ?? vote.title,
                description: payload.description ?? vote.description,
                openAt: payload.openAt ? this.normalizeDate(payload.openAt) : vote.openAt,
                closeAt: payload.closeAt ? this.normalizeDate(payload.closeAt) : vote.closeAt,
                maxSelections: payload.maxSelections ?? vote.maxSelections,
                metadata: payload.metadata ?? vote.metadata,
            });
            await vote.save();

            if (payload.options) {
                await this.syncOptions(vote, payload.options, trx, true);
            }

            await trx.commit();
            await vote.load('options');
            return vote;
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    public async delete(proposition: Proposition, vote: PropositionVote, actor: User): Promise<void> {
        await this.ensureCanManageVotes(proposition, actor);

        // Only admins can delete published votes
        if (vote.status !== PropositionVoteStatusEnum.DRAFT && actor.role !== 'admin') {
            throw new Error('votes.delete.locked');
        }

        await vote.delete();
    }

    public async changeStatus(proposition: Proposition, vote: PropositionVote, actor: User, status: PropositionVoteStatusEnum): Promise<PropositionVote> {
        await this.ensureCanManageVotes(proposition, actor);

        if (status === PropositionVoteStatusEnum.OPEN) {
            vote.status = PropositionVoteStatusEnum.OPEN;
            vote.openAt = DateTime.now();
        } else if (status === PropositionVoteStatusEnum.CLOSED) {
            vote.status = PropositionVoteStatusEnum.CLOSED;
            vote.closeAt = DateTime.now();
        } else if (status === PropositionVoteStatusEnum.CANCELLED) {
            vote.status = PropositionVoteStatusEnum.CANCELLED;
        } else if (status === PropositionVoteStatusEnum.DRAFT || status === PropositionVoteStatusEnum.SCHEDULED) {
            vote.status = status;
        }

        await vote.save();
        return vote;
    }

    private async ensureCanManageVotes(proposition: Proposition, actor: User): Promise<void> {
        const allowed = await this.workflowService.canPerform(proposition, actor, 'configure_vote');
        if (!allowed) {
            throw new Error('forbidden:votes');
        }
    }

    private normalizeDate(value: string | null | undefined): DateTime | null {
        if (!value) return null;
        const parsed = DateTime.fromISO(value);
        if (!parsed.isValid) {
            throw new Error('invalid-date');
        }
        return parsed;
    }

    private async syncOptions(vote: PropositionVote, options: VoteOptionPayload[], trx: TransactionClientContract, replaceExisting = false): Promise<void> {
        if (replaceExisting) {
            await vote.related('options').query().useTransaction(trx).delete();
        }

        const payloads = options.map((option, index) => ({
            voteId: vote.id,
            label: option.label,
            description: option.description ?? null,
            position: option.position ?? index,
            metadata: option.metadata ?? {},
        }));

        if (payloads.length === 0) {
            throw new Error('votes.options.required');
        }

        await VoteOption.createMany(payloads, { client: trx });
    }
}
