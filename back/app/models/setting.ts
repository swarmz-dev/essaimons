import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';

export default class Setting extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare key: string;

    @column()
    declare value: Record<string, unknown>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
