import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import Notification from '#models/notification';
import { NotificationChannelEnum, DeliveryStatusEnum } from '#types';

export default class UserNotification extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare userId: string;

    @column()
    declare notificationId: string;

    @column()
    declare read: boolean;

    @column.dateTime()
    declare readAt: DateTime | null;

    @column()
    declare inAppSent: boolean;

    @column.dateTime()
    declare inAppSentAt: DateTime | null;

    @column()
    declare emailSent: boolean;

    @column.dateTime()
    declare emailSentAt: DateTime | null;

    @column()
    declare emailError: string | null;

    @column()
    declare pushSent: boolean;

    @column.dateTime()
    declare pushSentAt: DateTime | null;

    @column()
    declare pushError: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @belongsTo(() => Notification)
    declare notification: BelongsTo<typeof Notification>;
}
