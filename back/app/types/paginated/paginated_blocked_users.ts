import type { SerializedBlockedUser } from '../serialized/serialized_blocked_user.js';

export type PaginatedBlockedUsers = {
    blockedUsers: SerializedBlockedUser[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};

export default PaginatedBlockedUsers;
