import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import User from '#models/user';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import PendingFriend from '#models/pending_friend';
import SerializedPendingFriendNotification from '#types/serialized/serialized_pending_friend_notification';
import NotificationTypeEnum from '#types/enum/notification_type_enum';

export default class PendingFriendNotification extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare forId: string;

    @belongsTo((): typeof User => User, {
        foreignKey: 'forId',
    })
    declare for: BelongsTo<typeof User>;

    @column()
    declare fromId: string;

    @belongsTo((): typeof User => User, {
        foreignKey: 'fromId',
    })
    declare from: BelongsTo<typeof User>;

    @column()
    declare pendingFriendId: string;

    @belongsTo((): typeof PendingFriend => PendingFriend)
    declare pendingFriend: BelongsTo<typeof PendingFriend>;

    @column()
    declare seen: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedPendingFriendNotification {
        return {
            id: this.frontId,
            seen: this.seen,
            from: this.from.apiSerialize(),
            type: NotificationTypeEnum.PENDING_FRIEND,
            createdAt: this.createdAt?.toString(),
            updatedAt: this.updatedAt?.toString(),
        };
    }
}
