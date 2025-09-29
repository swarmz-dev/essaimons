import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import PropositionVote from '#models/proposition_vote';
import User from '#models/user';

export default class VoteBallot extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare voteId: string;

    @column()
    declare voterId: string;

    @column()
    declare payload: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare recordedAt: DateTime;

    @column.dateTime()
    declare revokedAt?: DateTime | null;

    @belongsTo((): typeof PropositionVote => PropositionVote, {
        foreignKey: 'voteId',
    })
    declare vote: BelongsTo<typeof PropositionVote>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'voterId',
    })
    declare voter: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
