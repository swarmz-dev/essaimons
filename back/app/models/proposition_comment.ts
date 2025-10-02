import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import User from '#models/user';
import { PropositionCommentScopeEnum, PropositionCommentVisibilityEnum } from '#types';

export default class PropositionComment extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare parentId?: string | null;

    @column()
    declare authorId: string;

    @column()
    declare scope: PropositionCommentScopeEnum;

    @column()
    declare section: string | null;

    @column()
    declare visibility: PropositionCommentVisibilityEnum;

    @column()
    declare content: string;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @belongsTo((): typeof PropositionComment => PropositionComment, {
        foreignKey: 'parentId',
    })
    declare parent?: BelongsTo<typeof PropositionComment>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'authorId',
    })
    declare author: BelongsTo<typeof User>;

    @hasMany((): typeof PropositionComment => PropositionComment, {
        foreignKey: 'parentId',
    })
    declare replies: HasMany<typeof PropositionComment>;
}
