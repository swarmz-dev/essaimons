import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import Proposition from '#models/proposition';
import PropositionEvent from '#models/proposition_event';
import type User from '#models/user';
import { PropositionEventTypeEnum } from '#types/enum/proposition_event_type_enum';
import PropositionWorkflowService from '#services/proposition_workflow_service';

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

@inject()
export default class PropositionEventService {
    constructor(private readonly workflowService: PropositionWorkflowService) {}

    public async list(proposition: Proposition): Promise<PropositionEvent[]> {
        return proposition.related('events').query().orderBy('start_at', 'asc').orderBy('created_at', 'asc');
    }

    public async create(proposition: Proposition, actor: User, payload: CreateEventPayload, trx?: TransactionClientContract): Promise<PropositionEvent> {
        await this.ensureCanManageEvents(proposition, actor);

        const normalized = this.normalizePayload(payload);

        const event = await PropositionEvent.create(
            {
                propositionId: proposition.id,
                ...normalized,
                createdByUserId: actor.id,
            },
            trx ? { client: trx } : undefined
        );

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

    private normalizePayload<T extends UpdateEventPayload | CreateEventPayload>(payload: T): T {
        const toDate = (value?: string | null): DateTime | null => {
            if (!value) return null;
            const parsed = DateTime.fromISO(value);
            if (!parsed.isValid) {
                throw new Error('invalid-date');
            }
            return parsed;
        };

        const result: any = { ...payload };
        if (payload.startAt !== undefined) {
            result.startAt = toDate(payload.startAt);
        }
        if (payload.endAt !== undefined) {
            result.endAt = toDate(payload.endAt);
        }
        return result;
    }
}
