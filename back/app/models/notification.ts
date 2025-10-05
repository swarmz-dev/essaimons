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
    declare messageKey: string;

    @column({
        prepare: (value: Record<string, any>) => JSON.stringify(value),
        consume: (value: string) => (value ? JSON.parse(value) : {}),
    })
    declare data: Record<string, any>;

    @column()
    declare entityType: string | null;

    @column()
    declare entityId: string | null;

    @column()
    declare actionUrl: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @hasMany(() => UserNotification)
    declare userNotifications: HasMany<typeof UserNotification>;
}
