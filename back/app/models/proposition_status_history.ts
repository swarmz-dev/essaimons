import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import User from '#models/user';
import { PropositionStatusEnum } from '#types';

export default class PropositionStatusHistory extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare fromStatus: PropositionStatusEnum;

    @column()
    declare toStatus: PropositionStatusEnum;

    @column()
    declare triggeredByUserId?: string | null;

    @column()
    declare reason?: string | null;

    @column()
    declare metadata: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'triggeredByUserId',
    })
    declare triggeredBy: BelongsTo<typeof User>;
}
