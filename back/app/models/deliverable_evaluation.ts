import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import MandateDeliverable from '#models/mandate_deliverable';
import User from '#models/user';
import { DeliverableVerdictEnum } from '#types';

export default class DeliverableEvaluation extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare deliverableId: string;

    @column()
    declare evaluatorUserId: string;

    @column()
    declare verdict: DeliverableVerdictEnum;

    @column()
    declare comment?: string | null;

    @column.dateTime({ autoCreate: true })
    declare recordedAt: DateTime;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof MandateDeliverable => MandateDeliverable, {
        foreignKey: 'deliverableId',
    })
    declare deliverable: BelongsTo<typeof MandateDeliverable>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'evaluatorUserId',
    })
    declare evaluator: BelongsTo<typeof User>;
}
