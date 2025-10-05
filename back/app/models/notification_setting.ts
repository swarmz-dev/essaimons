import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import { NotificationTypeEnum } from '#models/notification';

export default class NotificationSetting extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare userId: string;

    @column()
    declare notificationType: NotificationTypeEnum;

    @column()
    declare inAppEnabled: boolean;

    @column()
    declare emailEnabled: boolean;

    @column()
    declare pushEnabled: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;
}
