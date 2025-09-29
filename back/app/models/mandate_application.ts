import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import PropositionMandate from '#models/proposition_mandate';
import User from '#models/user';
import { MandateApplicationStatusEnum } from '#types';

export default class MandateApplication extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare mandateId: string;

    @column()
    declare applicantUserId: string;

    @column()
    declare statement?: string | null;

    @column()
    declare status: MandateApplicationStatusEnum;

    @column.dateTime({ autoCreate: true })
    declare submittedAt: DateTime;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo((): typeof PropositionMandate => PropositionMandate, {
        foreignKey: 'mandateId',
    })
    declare mandate: BelongsTo<typeof PropositionMandate>;

    @belongsTo((): typeof User => User, {
        foreignKey: 'applicantUserId',
    })
    declare applicant: BelongsTo<typeof User>;
}
