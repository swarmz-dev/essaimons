import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import User from '#models/user';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import SerializedBlockedUser from '#types/serialized/serialized_blocked_user';

export default class BlockedUser extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare blockerId: string;

    @belongsTo((): typeof User => User, {
        foreignKey: 'blockerId',
    })
    declare blocker: BelongsTo<typeof User>;

    @column()
    declare blockedId: string;

    @belongsTo((): typeof User => User, {
        foreignKey: 'blockedId',
    })
    declare blocked: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedBlockedUser {
        return {
            id: this.frontId,
            user: this.blocked.apiSerialize(),
            updatedAt: this.updatedAt?.toString(),
            createdAt: this.createdAt?.toString(),
        };
    }
}
