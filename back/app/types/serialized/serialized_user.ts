import type { UserRoleEnum } from '../enum/user_role_enum.js';
import type { SerializedFile } from './serialized_file.js';

export type SerializedUser = {
    id: number;
    username: string;
    email: string;
    role: UserRoleEnum;
    enabled: boolean;
    acceptedTermsAndConditions: boolean;
    receivedFriendRequest?: boolean;
    sentFriendRequest?: boolean;
    profilePicture?: SerializedFile;
    updatedAt?: string;
    createdAt?: string;
};

export default SerializedUser;
