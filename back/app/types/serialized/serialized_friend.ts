import type { SerializedUser } from './serialized_user.js';

export type SerializedFriend = {
    id: number;
    friend: SerializedUser;
    createdAt?: string;
    updatedAt?: string;
};

export default SerializedFriend;
