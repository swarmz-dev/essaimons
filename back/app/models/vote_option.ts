import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import PropositionVote from '#models/proposition_vote';

export default class VoteOption extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare voteId: string;

    @column()
    declare label: string;

    @column()
    declare description?: string | null;

    @column()
    declare position: number;

    @column()
    declare metadata: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof PropositionVote => PropositionVote, {
        foreignKey: 'voteId',
    })
    declare vote: BelongsTo<typeof PropositionVote>;
}
