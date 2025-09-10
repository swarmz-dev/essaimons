import type { SerializedFriend } from '../serialized/serialized_friend.js';

export type PaginatedPendingFriends = {
    pendingFriends: SerializedFriend[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};

export default PaginatedPendingFriends;
