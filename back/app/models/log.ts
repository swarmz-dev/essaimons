import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import LogUser from '#models/log_user';
import LogRouteMethodEnum from '#types/enum/log_route_method_enum';
import LogResponseStatusEnum from '#types/enum/log_response_status_enum';
import SerializedLog from '#types/serialized/serialized_log';

export default class Log extends BaseModel {
    static connection: string = 'logs';

    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare route: string;

    @column()
    declare routeMethod: LogRouteMethodEnum;

    @column()
    declare queryString: Record<string, unknown>;

    @column()
    declare params?: Record<string, unknown>;

    @column()
    declare body?: Record<string, unknown>;

    @column()
    declare responseStatus: LogResponseStatusEnum;

    @column()
    declare responseBody: Record<string, unknown>;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare startTime: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare endTime: DateTime;

    @column()
    declare userId: string;

    @belongsTo((): typeof LogUser => LogUser, {
        foreignKey: 'userId',
    })
    declare user: BelongsTo<typeof LogUser>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedLog {
        return {
            id: this.frontId,
            route: this.route,
            routeMethod: this.routeMethod,
            queryString: this.queryString,
            params: this.params,
            body: this.body,
            responseStatus: this.responseStatus,
            responseBody: this.responseBody,
            startTime: this.startTime.toString(),
            endTime: this.endTime.toString(),
            user: this.user?.apiSerialize(),
            updatedAt: this.updatedAt.toString(),
            createdAt: this.createdAt.toString(),
        };
    }
}
