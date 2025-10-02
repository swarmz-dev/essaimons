import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import VoteBallotService from '#services/vote_ballot_service';
import PropositionVote from '#models/proposition_vote';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { castBallotValidator } from '#validators/vote_ballot';

@inject()
export default class VoteBallotController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly ballotService: VoteBallotService
    ) {}

    public async show({ request, response, user }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const ballot = await this.ballotService.getUserBallot(vote, user as User);
            if (!ballot) {
                return response.ok({ ballot: null });
            }
            return response.ok({ ballot: ballot.toJSON() });
        } catch (error) {
            logger.error('ballot.show.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to fetch ballot' });
        }
    }

    public async store({ request, response, user }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const payload = await castBallotValidator.validate(request.all());
            const ballot = await this.ballotService.cast(proposition, vote, user as User, payload as any);
            return response.created({ ballot: ballot.toJSON() });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to vote on this proposition' });
            }
            if (error instanceof Error && error.message.startsWith('vote.')) {
                return response.badRequest({ error: error.message });
            }
            if (error instanceof Error && error.message.startsWith('ballot.')) {
                return response.badRequest({ error: error.message });
            }
            logger.error('ballot.cast.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to cast ballot' });
        }
    }

    public async results({ request, response }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const results = await this.ballotService.getResults(vote);
            return response.ok({ results });
        } catch (error) {
            logger.error('ballot.results.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to fetch results' });
        }
    }

    public async destroy({ request, response, user }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const ballot = await this.ballotService.getUserBallot(vote, user as User);
            if (!ballot) {
                return response.notFound({ error: 'Ballot not found' });
            }

            await this.ballotService.revoke(vote, ballot, user as User);
            return response.noContent();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to revoke this ballot' });
            }
            logger.error('ballot.revoke.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to revoke ballot' });
        }
    }

    private async findProposition(id: string, response: HttpContext['response']): Promise<Proposition | null> {
        const proposition = await this.propositionRepository.findByPublicId(id);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }

    private async findVote(proposition: Proposition, voteId: string, response: HttpContext['response']): Promise<PropositionVote | null> {
        const vote = await PropositionVote.query().where('id', voteId).where('propositionId', proposition.id).preload('options').first();
        if (!vote) {
            response.notFound({ error: 'Vote not found' });
            return null;
        }
        return vote;
    }
}
