import type { SerializedUser } from './serialized_user.js';
import type { NotificationTypeEnum } from '../enum/notification_type_enum.js';

export type SerializedPendingFriendNotification = {
    id: number;
    seen: boolean;
    from: SerializedUser;
    type: NotificationTypeEnum.PENDING_FRIEND;
    createdAt?: string;
    updatedAt?: string;
};

export default SerializedPendingFriendNotification;
