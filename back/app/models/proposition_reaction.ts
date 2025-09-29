import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import User from '#models/user';
import { PropositionReactionTypeEnum } from '#types';

export default class PropositionReaction extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare authorId: string;

    @column()
    declare type: PropositionReactionTypeEnum;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'authorId',
    })
    declare author: BelongsTo<typeof User>;
}
