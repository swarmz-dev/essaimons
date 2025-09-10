import type { SerializedFriend } from '../serialized/serialized_friend.js';

export type PaginatedFriends = {
    friends: SerializedFriend[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};

export default PaginatedFriends;
