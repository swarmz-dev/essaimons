import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import Notification from '#models/notification';

export default class PendingEmailNotification extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare userId: string;

    @column()
    declare notificationId: string;

    @column()
    declare sent: boolean;

    @column.dateTime()
    declare scheduledFor: DateTime;

    @column.dateTime()
    declare sentAt: DateTime | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @belongsTo(() => Notification)
    declare notification: BelongsTo<typeof Notification>;
}
