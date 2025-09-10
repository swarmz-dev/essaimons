import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm';
import User from '#models/user';
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations';
import SerializedPendingFriend from '#types/serialized/serialized_pending_friend';
import PendingFriendNotification from '#models/pending_friend_notification';

export default class PendingFriend extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare userId: string;

    @belongsTo((): typeof User => User)
    declare user: BelongsTo<typeof User>;

    @hasOne((): typeof PendingFriendNotification => PendingFriendNotification)
    declare notification: HasOne<typeof PendingFriendNotification>;

    @column()
    declare friendId: string;

    @belongsTo((): typeof User => User, {
        foreignKey: 'friendId',
    })
    declare friend: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedPendingFriend {
        return {
            id: this.frontId,
            friend: this.friend.apiSerialize(),
            notification: this.notification.apiSerialize(),
            updatedAt: this.updatedAt?.toString(),
            createdAt: this.createdAt?.toString(),
        };
    }
}
