import { DateTime } from 'luxon';
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import UserNotification from '#models/user_notification';

export enum NotificationTypeEnum {
    STATUS_TRANSITION = 'status_transition',
    MANDATE_ASSIGNED = 'mandate_assigned',
    MANDATE_REVOKED = 'mandate_revoked',
    DELIVERABLE_UPLOADED = 'deliverable_uploaded',
    DELIVERABLE_EVALUATED = 'deliverable_evaluated',
    DEADLINE_APPROACHING = 'deadline_approaching',
    NONCONFORMITY_THRESHOLD = 'nonconformity_threshold',
    PROCEDURE_OPENED = 'procedure_opened',
    REVOCATION_VOTE_OPENED = 'revocation_vote_opened',
    COMMENT_ADDED = 'comment_added',
    CLARIFICATION_ADDED = 'clarification_added',
    CLARIFICATION_UPDATED = 'clarification_updated',
    CLARIFICATION_DELETED = 'clarification_deleted',
    EXCHANGE_SCHEDULED = 'exchange_scheduled',
}

export default class Notification extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare type: NotificationTypeEnum;

    @column()
    declare titleKey: string;

    @column()
    declare bodyKey: string;

    @column({
        prepare: (value: Record<string, any>) => JSON.stringify(value),
        consume: (value: string | Record<string, any>) => {
            if (!value) return {};
            if (typeof value === 'string') return JSON.parse(value);
            return value;
        },
    })
    declare interpolationData: Record<string, any>;

    @column()
    declare propositionId: string | null;

    @column()
    declare mandateId: string | null;

    @column()
    declare deliverableId: string | null;

    @column()
    declare voteId: string | null;

    @column()
    declare actionUrl: string | null;

    @column()
    declare priority: string;

    @column({
        prepare: (value: Record<string, any> | null) => (value ? JSON.stringify(value) : null),
        consume: (value: string | Record<string, any> | null) => {
            if (!value) return null;
            if (typeof value === 'string') return JSON.parse(value);
            return value;
        },
    })
    declare metadata: Record<string, any> | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @hasMany(() => UserNotification)
    declare userNotifications: HasMany<typeof UserNotification>;
}
