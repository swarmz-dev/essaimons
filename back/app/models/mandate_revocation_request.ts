import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import PropositionMandate from '#models/proposition_mandate';
import User from '#models/user';
import PropositionVote from '#models/proposition_vote';
import { MandateRevocationStatusEnum } from '#types';

export default class MandateRevocationRequest extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare mandateId: string;

    @column()
    declare initiatedByUserId: string;

    @column()
    declare reason?: string | null;

    @column()
    declare status: MandateRevocationStatusEnum;

    @column()
    declare voteId?: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime()
    declare resolvedAt?: DateTime | null;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof PropositionMandate => PropositionMandate, {
        foreignKey: 'mandateId',
    })
    declare mandate: BelongsTo<typeof PropositionMandate>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'initiatedByUserId',
    })
    declare initiatedBy: BelongsTo<typeof User>;

    @belongsTo((): typeof PropositionVote => PropositionVote, {
        foreignKey: 'voteId',
    })
    declare vote?: BelongsTo<typeof PropositionVote>;
}
