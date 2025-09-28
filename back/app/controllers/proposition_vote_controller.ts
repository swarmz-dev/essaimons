import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionVoteService from '#services/proposition_vote_service';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import PropositionVote from '#models/proposition_vote';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { createVoteValidator, updateVoteValidator, changeVoteStatusValidator } from '#validators/proposition_vote';

@inject()
export default class PropositionVoteController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly voteService: PropositionVoteService,
        private readonly workflowService: PropositionWorkflowService
    ) {}

    public async index({ request, response }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const votes = await this.voteService.list(proposition);
        return response.ok({ votes: votes.map((vote) => vote.toJSON()) });
    }

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        try {
            const payload = await createVoteValidator.validate(request.all());
            const created = await this.voteService.create(proposition, user as User, payload);
            await created.load('options');
            return response.created({ vote: created.toJSON() });
        } catch (error) {
            logger.error('proposition.votes.create.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to create vote' });
        }
    }

    public async update(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const payload = await updateVoteValidator.validate(request.all());
            const updated = await this.voteService.update(proposition, vote, user as User, payload);
            await updated.load('options');
            return response.ok({ vote: updated.toJSON() });
        } catch (error) {
            logger.error('proposition.votes.update.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to update vote' });
        }
    }

    public async changeStatus(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            const payload = await changeVoteStatusValidator.validate(request.all());
            const updated = await this.voteService.changeStatus(proposition, vote, user as User, payload.status);
            await updated.load('options');
            return response.ok({ vote: updated.toJSON() });
        } catch (error) {
            logger.error('proposition.votes.status.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to change vote status' });
        }
    }

    public async destroy(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const vote = await this.findVote(proposition, request.param('voteId'), response);
        if (!vote) return;

        try {
            await this.voteService.delete(proposition, vote, user as User);
            return response.noContent();
        } catch (error) {
            logger.error('proposition.votes.delete.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to delete vote' });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']): Promise<Proposition | null> {
        if (!param || typeof param !== 'string' || param.trim().length === 0) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }
        const proposition = await this.propositionRepository.findByPublicId(param.trim(), ['votes']);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }

    private async findVote(proposition: Proposition, voteId: string, response: HttpContext['response']): Promise<PropositionVote | null> {
        if (!voteId) {
            response.badRequest({ error: 'Invalid vote id' });
            return null;
        }
        const vote = await PropositionVote.find(voteId);
        if (!vote || vote.propositionId !== proposition.id) {
            response.notFound({ error: 'Vote not found' });
            return null;
        }
        return vote;
    }
}
