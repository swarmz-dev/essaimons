import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';

export default class DeadlineReminderSent extends BaseModel {
    static table = 'deadline_reminders_sent';

    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare propositionId: string;

    @column()
    declare reminderType: string;

    @column()
    declare deadlineType: string;

    @column.dateTime()
    declare deadlineAt: DateTime;

    @column.dateTime()
    declare sentAt: DateTime;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @belongsTo(() => Proposition)
    declare proposition: BelongsTo<typeof Proposition>;
}
