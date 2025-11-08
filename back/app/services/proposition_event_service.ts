import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import Proposition from '#models/proposition';
import PropositionEvent from '#models/proposition_event';
import type User from '#models/user';
import { PropositionEventTypeEnum } from '#types/enum/proposition_event_type_enum';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import PropositionNotificationService from '#services/proposition_notification_service';
import logger from '@adonisjs/core/services/logger';

interface BaseEventPayload {
    type: PropositionEventTypeEnum;
    title: string;
    description?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    location?: string | null;
    videoLink?: string | null;
}

interface CreateEventPayload extends BaseEventPayload {}

interface UpdateEventPayload extends Partial<BaseEventPayload> {}

type NormalizedEventPayload = {
    type?: PropositionEventTypeEnum;
    title?: string;
    description?: string | null;
    startAt?: DateTime | null;
    endAt?: DateTime | null;
    location?: string | null;
    videoLink?: string | null;
};

@inject()
export default class PropositionEventService {
    constructor(
        private readonly workflowService: PropositionWorkflowService,
        private readonly propositionNotificationService: PropositionNotificationService
    ) {}

    public async list(proposition: Proposition): Promise<PropositionEvent[]> {
        return await proposition.related('events').query().orderBy('start_at', 'asc').orderBy('created_at', 'asc');
    }

    public async create(proposition: Proposition, actor: User, payload: CreateEventPayload, trx?: TransactionClientContract): Promise<PropositionEvent> {
        await this.ensureCanManageEvents(proposition, actor);

        const normalized = this.normalizePayload(payload);

        const event = await PropositionEvent.create(
            {
                propositionId: proposition.id,
                type: normalized.type ?? payload.type,
                title: normalized.title ?? payload.title,
                description: normalized.description ?? payload.description ?? null,
                startAt: normalized.startAt ?? null,
                endAt: normalized.endAt ?? null,
                location: normalized.location ?? payload.location ?? null,
                videoLink: normalized.videoLink ?? payload.videoLink ?? null,
                createdByUserId: actor.id,
            },
            trx ? { client: trx } : undefined
        );

        // Send notification for exchange scheduled
        this.propositionNotificationService.notifyExchangeScheduled(proposition, event).catch((error: Error) => {
            logger.error({ err: error, eventId: event.id }, 'Failed to send exchange scheduled notification');
        });

        return event;
    }

    public async update(proposition: Proposition, event: PropositionEvent, actor: User, payload: UpdateEventPayload): Promise<PropositionEvent> {
        await this.ensureCanManageEvents(proposition, actor);

        const normalized = this.normalizePayload(payload);
        event.merge({ ...normalized });
        await event.save();
        return event;
    }

    public async delete(proposition: Proposition, event: PropositionEvent, actor: User): Promise<void> {
        await this.ensureCanManageEvents(proposition, actor);
        await event.delete();
    }

    private async ensureCanManageEvents(proposition: Proposition, actor: User): Promise<void> {
        const allowed = await this.workflowService.canPerform(proposition, actor, 'manage_events');
        if (!allowed) {
            throw new Error('forbidden:events');
        }
    }

    private normalizePayload(payload: UpdateEventPayload | CreateEventPayload): NormalizedEventPayload {
        const toDate = (value?: string | null): DateTime | null => {
            if (!value) return null;
            const parsed = DateTime.fromISO(value);
            if (!parsed.isValid) {
                throw new Error('invalid-date');
            }
            return parsed;
        };

        const result: NormalizedEventPayload = {};

        if ('type' in payload && payload.type !== undefined) {
            result.type = payload.type;
        }
        if ('title' in payload && payload.title !== undefined) {
            result.title = payload.title;
        }
        if ('description' in payload) {
            result.description = payload.description ?? null;
        }
        if ('startAt' in payload) {
            result.startAt = payload.startAt !== undefined ? toDate(payload.startAt) : undefined;
        }
        if ('endAt' in payload) {
            result.endAt = payload.endAt !== undefined ? toDate(payload.endAt) : undefined;
        }
        if ('location' in payload) {
            result.location = payload.location ?? null;
        }
        if ('videoLink' in payload) {
            result.videoLink = payload.videoLink ?? null;
        }

        return result;
    }
}
