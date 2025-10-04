import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionMandateService from '#services/proposition_mandate_service';
import PropositionMandate from '#models/proposition_mandate';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { createMandateValidator, updateMandateValidator } from '#validators/proposition_mandate';
import { serializeMandate } from '#serializers/mandate_serializer';

@inject()
export default class PropositionMandateController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly mandateService: PropositionMandateService
    ) {}

    public async index({ request, response }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandates = await this.mandateService.list(proposition);
        return response.ok({ mandates });
    }

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        try {
            const payload = await createMandateValidator.validate(request.all());
            const created = await this.mandateService.create(proposition, user as User, payload);
            return response.created({ mandate: serializeMandate(created) });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage mandates for this proposition' });
            }
            logger.error('proposition.mandates.create.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to create mandate' });
        }
    }

    public async update(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        try {
            const payload = await updateMandateValidator.validate(request.all());
            const updated = await this.mandateService.update(proposition, mandate, user as User, payload);
            return response.ok({ mandate: serializeMandate(updated) });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage mandates for this proposition' });
            }
            logger.error('proposition.mandates.update.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to update mandate' });
        }
    }

    public async destroy(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        try {
            await this.mandateService.delete(proposition, mandate, user as User);
            return response.noContent();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage mandates for this proposition' });
            }
            logger.error('proposition.mandates.delete.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to delete mandate' });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']): Promise<Proposition | null> {
        if (!param || typeof param !== 'string' || param.trim().length === 0) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }
        const proposition = await this.propositionRepository.findByPublicId(param.trim(), ['mandates']);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }

    private async findMandate(proposition: Proposition, mandateId: string, response: HttpContext['response']): Promise<PropositionMandate | null> {
        if (!mandateId) {
            response.badRequest({ error: 'Invalid mandate id' });
            return null;
        }
        const mandate = await PropositionMandate.find(mandateId);
        if (!mandate || mandate.propositionId !== proposition.id) {
            response.notFound({ error: 'Mandate not found' });
            return null;
        }
        return mandate;
    }
}
