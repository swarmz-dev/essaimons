import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionEventService from '#services/proposition_event_service';
import type Proposition from '#models/proposition';
import type PropositionEvent from '#models/proposition_event';
import type User from '#models/user';
import { createEventValidator, updateEventValidator } from '#validators/proposition_event';

@inject()
export default class PropositionEventController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly eventService: PropositionEventService
    ) {}

    public async index({ request, response }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const events = await this.eventService.list(proposition);
        return response.ok({ events: events.map((event) => event.toJSON()) });
    }

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        try {
            const payload = await createEventValidator.validate(request.all());
            const actor = user as User;
            const created = await this.eventService.create(proposition, actor, payload);
            return response.created({ event: created.toJSON() });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage events for this proposition' });
            }
            logger.error('proposition.events.create.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: 'Unable to create event' });
        }
    }

    public async update(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const eventId = request.param('eventId');
        const event = await PropositionEvent.find(eventId);
        if (!event || event.propositionId !== proposition.id) {
            return response.notFound({ error: 'Event not found' });
        }

        try {
            const payload = await updateEventValidator.validate(request.all());
            const actor = user as User;
            const updated = await this.eventService.update(proposition, event, actor, payload);
            return response.ok({ event: updated.toJSON() });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage events for this proposition' });
            }
            logger.error('proposition.events.update.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: 'Unable to update event' });
        }
    }

    public async destroy(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const eventId = request.param('eventId');
        const event = await PropositionEvent.find(eventId);
        if (!event || event.propositionId !== proposition.id) {
            return response.notFound({ error: 'Event not found' });
        }

        try {
            await this.eventService.delete(proposition, event, user as User);
            return response.noContent();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to manage events for this proposition' });
            }
            logger.error('proposition.events.delete.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: 'Unable to delete event' });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']): Promise<Proposition | null> {
        if (!param || typeof param !== 'string' || param.trim().length === 0) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }
        const proposition = await this.propositionRepository.findByPublicId(param.trim(), ['events']);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }
}
