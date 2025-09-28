import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import User from '#models/user';
import MandateApplication from '#models/mandate_application';
import MandateDeliverable from '#models/mandate_deliverable';
import MandateRevocationRequest from '#models/mandate_revocation_request';
import { MandateStatusEnum } from '#types';

export default class PropositionMandate extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare title: string;

    @column()
    declare description?: string | null;

    @column()
    declare holderUserId?: string | null;

    @column()
    declare status: MandateStatusEnum;

    @column()
    declare targetObjectiveRef?: string | null;

    @column.dateTime()
    declare initialDeadline?: DateTime | null;

    @column.dateTime()
    declare currentDeadline?: DateTime | null;

    @column.dateTime()
    declare lastStatusUpdateAt?: DateTime | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof Proposition => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'holderUserId',
    })
    declare holder?: BelongsTo<typeof User>;

    @hasMany((): typeof MandateApplication => MandateApplication, {
        foreignKey: 'mandateId',
    })
    declare applications: HasMany<typeof MandateApplication>;

    @hasMany((): typeof MandateDeliverable => MandateDeliverable, {
        foreignKey: 'mandateId',
    })
    declare deliverables: HasMany<typeof MandateDeliverable>;

    @hasMany((): typeof MandateRevocationRequest => MandateRevocationRequest, {
        foreignKey: 'mandateId',
    })
    declare revocationRequests: HasMany<typeof MandateRevocationRequest>;
}
