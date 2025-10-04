import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import PropositionVote from '#models/proposition_vote';
import VoteBallot from '#models/vote_ballot';
import type User from '#models/user';
import type Proposition from '#models/proposition';
import { PropositionVoteMethodEnum, PropositionVoteStatusEnum } from '#types';
import PropositionWorkflowService from '#services/proposition_workflow_service';

interface BinaryBallotPayload {
    optionId: string;
}

interface MultiChoiceBallotPayload {
    optionIds: string[];
}

interface MajorityJudgmentBallotPayload {
    ratings: Record<string, number>; // optionId -> rating (0-5)
}

type CastBallotPayload = BinaryBallotPayload | MultiChoiceBallotPayload | MajorityJudgmentBallotPayload;

@inject()
export default class VoteBallotService {
    constructor(private readonly workflowService: PropositionWorkflowService) {}

    public async getUserBallot(vote: PropositionVote, user: User): Promise<VoteBallot | null> {
        return VoteBallot.query().where('voteId', vote.id).where('voterId', user.id).whereNull('revokedAt').first();
    }

    public async cast(proposition: Proposition, vote: PropositionVote, actor: User, payload: CastBallotPayload): Promise<VoteBallot> {
        // Check voting permission (contributors, initiators, and admins can vote)
        const allowed = await this.workflowService.canPerform(proposition, actor, 'participate_vote');
        const isInitiator = proposition.creatorId === actor.id;
        const isAdmin = actor.role === 'admin';

        if (!allowed && !isInitiator && !isAdmin) {
            throw new Error('forbidden:vote');
        }

        // Check that the vote is open
        if (vote.status !== PropositionVoteStatusEnum.OPEN) {
            throw new Error('vote.not_open');
        }

        // Check that the user hasn't already voted
        const existing = await this.getUserBallot(vote, actor);
        if (existing) {
            throw new Error('vote.already_voted');
        }

        // Load vote options
        await vote.load('options');

        // Validate the ballot according to the voting method
        this.validateBallot(vote, payload);

        // Create the ballot
        const ballot = await VoteBallot.create({
            voteId: vote.id,
            voterId: actor.id,
            payload: payload as Record<string, unknown>,
        });

        return ballot;
    }

    public async revoke(vote: PropositionVote, ballot: VoteBallot, actor: User): Promise<void> {
        // Only the voter or an admin can revoke
        if (ballot.voterId !== actor.id && actor.role !== 'admin') {
            throw new Error('forbidden:revoke_ballot');
        }

        // Vérifier que le vote est encore ouvert
        if (vote.status !== PropositionVoteStatusEnum.OPEN) {
            throw new Error('vote.not_open');
        }

        // Delete the ballot to allow re-voting
        await ballot.delete();
    }

    public async getResults(vote: PropositionVote): Promise<Record<string, unknown>> {
        // Load non-revoked ballots
        const ballots = await VoteBallot.query().where('voteId', vote.id).whereNull('revokedAt');

        await vote.load('options');

        const totalVotes = ballots.length;
        const results: Record<string, unknown> = {
            totalVotes,
            method: vote.method,
        };

        if (vote.method === PropositionVoteMethodEnum.BINARY) {
            results.optionCounts = this.calculateBinaryResults(vote, ballots);
        } else if (vote.method === PropositionVoteMethodEnum.MULTI_CHOICE) {
            results.optionCounts = this.calculateMultiChoiceResults(vote, ballots);
        } else if (vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT) {
            results.optionRatings = this.calculateMajorityJudgmentResults(vote, ballots);
        }

        return results;
    }

    private validateBallot(vote: PropositionVote, payload: CastBallotPayload): void {
        const optionIds = vote.options.map((o) => o.id);

        if (vote.method === PropositionVoteMethodEnum.BINARY) {
            const binaryPayload = payload as BinaryBallotPayload;
            if (!binaryPayload.optionId || !optionIds.includes(binaryPayload.optionId)) {
                throw new Error('ballot.invalid_option');
            }
        } else if (vote.method === PropositionVoteMethodEnum.MULTI_CHOICE) {
            const multiPayload = payload as MultiChoiceBallotPayload;
            if (!Array.isArray(multiPayload.optionIds) || multiPayload.optionIds.length === 0) {
                throw new Error('ballot.no_options_selected');
            }
            if (vote.maxSelections && multiPayload.optionIds.length > vote.maxSelections) {
                throw new Error('ballot.too_many_selections');
            }
            for (const optionId of multiPayload.optionIds) {
                if (!optionIds.includes(optionId)) {
                    throw new Error('ballot.invalid_option');
                }
            }
        } else if (vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT) {
            const mjPayload = payload as MajorityJudgmentBallotPayload;
            if (!mjPayload.ratings || typeof mjPayload.ratings !== 'object') {
                throw new Error('ballot.invalid_ratings');
            }
            // Check that all options have a rating
            for (const optionId of optionIds) {
                const rating = mjPayload.ratings[optionId];
                if (rating === undefined || rating < 0 || rating > 5) {
                    throw new Error('ballot.invalid_rating');
                }
            }
        }
    }

    private calculateBinaryResults(vote: PropositionVote, ballots: VoteBallot[]): Record<string, number> {
        const counts: Record<string, number> = {};
        vote.options.forEach((opt) => (counts[opt.id] = 0));

        for (const ballot of ballots) {
            const payload = ballot.payload as BinaryBallotPayload;
            if (payload.optionId && counts[payload.optionId] !== undefined) {
                counts[payload.optionId]++;
            }
        }

        return counts;
    }

    private calculateMultiChoiceResults(vote: PropositionVote, ballots: VoteBallot[]): Record<string, number> {
        const counts: Record<string, number> = {};
        vote.options.forEach((opt) => (counts[opt.id] = 0));

        for (const ballot of ballots) {
            const payload = ballot.payload as MultiChoiceBallotPayload;
            if (Array.isArray(payload.optionIds)) {
                for (const optionId of payload.optionIds) {
                    if (counts[optionId] !== undefined) {
                        counts[optionId]++;
                    }
                }
            }
        }

        return counts;
    }

    private calculateMajorityJudgmentResults(vote: PropositionVote, ballots: VoteBallot[]): Record<string, { ratings: number[]; median: number; average: number }> {
        const ratings: Record<string, number[]> = {};
        vote.options.forEach((opt) => (ratings[opt.id] = []));

        for (const ballot of ballots) {
            const payload = ballot.payload as MajorityJudgmentBallotPayload;
            if (payload.ratings) {
                for (const [optionId, rating] of Object.entries(payload.ratings)) {
                    if (ratings[optionId]) {
                        ratings[optionId].push(rating);
                    }
                }
            }
        }

        const results: Record<string, { ratings: number[]; median: number; average: number }> = {};
        for (const [optionId, optionRatings] of Object.entries(ratings)) {
            const sorted = [...optionRatings].sort((a, b) => a - b);
            const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
            const average = sorted.length > 0 ? sorted.reduce((sum, val) => sum + val, 0) / sorted.length : 0;
            results[optionId] = {
                ratings: optionRatings,
                median,
                average,
            };
        }

        return results;
    }
}
