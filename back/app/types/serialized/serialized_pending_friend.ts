import type { SerializedUser } from './serialized_user.js';
import type { SerializedPendingFriendNotification } from './serialized_pending_friend_notification.js';

export type SerializedPendingFriend = {
    id: number;
    friend: SerializedUser;
    notification: SerializedPendingFriendNotification;
    createdAt?: string;
    updatedAt?: string;
};

export default SerializedPendingFriend;
