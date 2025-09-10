import { DateTime } from 'luxon';
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import Log from '#models/log';
import SerializedLogUser from '#types/serialized/serialized_log_user';

export default class LogUser extends BaseModel {
    static connection: string = 'logs';

    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare email: string;

    @hasMany((): typeof Log => Log, {
        foreignKey: 'userId',
    })
    declare logs: HasMany<typeof Log>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedLogUser {
        return {
            id: this.frontId,
            email: this.email,
            logs: this.logs.map((log) => log.apiSerialize()),
            updatedAt: this.updatedAt.toString(),
            createdAt: this.createdAt.toString(),
        };
    }
}
