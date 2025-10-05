import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';

export default class PushSubscription extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare userId: string;

    @column()
    declare endpoint: string;

    @column()
    declare p256dhKey: string;

    @column()
    declare authKey: string;

    @column()
    declare userAgent: string | null;

    @column()
    declare active: boolean;

    @column.dateTime()
    declare lastUsedAt: DateTime | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;
}
