import type { SerializedUser } from '../serialized/serialized_user.js';

export type PaginatedUsers = {
    users: SerializedUser[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};

export default PaginatedUsers;
