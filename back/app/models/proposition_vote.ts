import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import VoteOption from '#models/vote_option';
import VoteBallot from '#models/vote_ballot';
import MandateRevocationRequest from '#models/mandate_revocation_request';
import { PropositionVotePhaseEnum, PropositionVoteMethodEnum, PropositionVoteStatusEnum } from '#types';

export default class PropositionVote extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare phase: PropositionVotePhaseEnum;

    @column()
    declare method: PropositionVoteMethodEnum;

    @column()
    declare title: string;

    @column()
    declare description?: string | null;

    @column.dateTime()
    declare openAt?: DateTime | null;

    @column.dateTime()
    declare closeAt?: DateTime | null;

    @column()
    declare maxSelections?: number | null;

    @column()
    declare status: PropositionVoteStatusEnum;

    @column()
    declare metadata: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @hasMany((): typeof VoteOption => VoteOption, {
        foreignKey: 'voteId',
    })
    declare options: HasMany<typeof VoteOption>;

    @hasMany((): typeof VoteBallot => VoteBallot, {
        foreignKey: 'voteId',
    })
    declare ballots: HasMany<typeof VoteBallot>;

    @hasMany((): typeof MandateRevocationRequest => MandateRevocationRequest, {
        foreignKey: 'voteId',
    })
    declare revocationRequests: HasMany<typeof MandateRevocationRequest>;
}
