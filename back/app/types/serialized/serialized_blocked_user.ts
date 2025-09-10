import type { SerializedUser } from './serialized_user.js';

export type SerializedBlockedUser = {
    id: number;
    user: SerializedUser;
    createdAt?: string;
    updatedAt?: string;
};

export default SerializedBlockedUser;
