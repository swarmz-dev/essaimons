import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import User from '#models/user';
import { PropositionEventTypeEnum } from '#types';

export default class PropositionEvent extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare type: PropositionEventTypeEnum;

    @column()
    declare title: string;

    @column()
    declare description?: string | null;

    @column.dateTime()
    declare startAt?: DateTime | null;

    @column.dateTime()
    declare endAt?: DateTime | null;

    @column()
    declare location?: string | null;

    @column()
    declare videoLink?: string | null;

    @column()
    declare createdByUserId?: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'createdByUserId',
    })
    declare createdBy?: BelongsTo<typeof User>;
}
