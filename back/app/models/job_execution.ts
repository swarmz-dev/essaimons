import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import { JobTypeEnum, JobStatusEnum } from '#types';

export default class JobExecution extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare jobType: JobTypeEnum;

    @column()
    declare status: JobStatusEnum;

    @column.dateTime()
    declare startedAt: DateTime;

    @column.dateTime()
    declare completedAt: DateTime | null;

    @column()
    declare durationMs: number | null;

    @column({
        prepare: (value: any) => (value === null ? null : JSON.stringify(value)),
        consume: (value: any) => {
            if (value === null) return null;
            if (typeof value === 'object') return value;
            return JSON.parse(value);
        },
    })
    declare metadata: Record<string, any> | null;

    @column()
    declare errorMessage: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
