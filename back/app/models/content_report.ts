import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import { ContentReportReasonEnum, ContentReportStatusEnum, ContentTypeEnum } from '#types';

export default class ContentReport extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare reporterUserId: string;

    @column()
    declare contentType: ContentTypeEnum;

    @column()
    declare contentId: string;

    @column()
    declare reason: ContentReportReasonEnum;

    @column()
    declare description: string | null;

    @column()
    declare status: ContentReportStatusEnum;

    @column()
    declare reviewedByUserId: string | null;

    @column.dateTime()
    declare reviewedAt: DateTime | null;

    @column()
    declare reviewNotes: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => User, {
        foreignKey: 'reporterUserId',
    })
    declare reporter: BelongsTo<typeof User>;

    @belongsTo(() => User, {
        foreignKey: 'reviewedByUserId',
    })
    declare reviewer: BelongsTo<typeof User>;
}
