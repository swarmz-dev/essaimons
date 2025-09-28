import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import PropositionMandate from '#models/proposition_mandate';
import File from '#models/file';
import User from '#models/user';
import DeliverableEvaluation from '#models/deliverable_evaluation';

export default class MandateDeliverable extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare mandateId: string;

    @column()
    declare fileId: string;

    @column()
    declare uploadedByUserId: string;

    @column()
    declare label?: string | null;

    @column()
    declare objectiveRef?: string | null;

    @column()
    declare autoFilename?: string | null;

    @column.dateTime({ autoCreate: true })
    declare uploadedAt: DateTime;

    @column.dateTime()
    declare evaluationDeadlineSnapshot?: DateTime | null;

    @column()
    declare metadata: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof PropositionMandate => PropositionMandate, {
        foreignKey: 'mandateId',
    })
    declare mandate: BelongsTo<typeof PropositionMandate>;

    @belongsTo((): typeof File => File, {
        foreignKey: 'fileId',
    })
    declare file: BelongsTo<typeof File>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'uploadedByUserId',
    })
    declare uploadedBy: BelongsTo<typeof User>;

    @hasMany((): typeof DeliverableEvaluation => DeliverableEvaluation, {
        foreignKey: 'deliverableId',
    })
    declare evaluations: HasMany<typeof DeliverableEvaluation>;
}
