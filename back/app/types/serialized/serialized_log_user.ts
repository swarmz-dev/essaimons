import type { SerializedLog } from './serialized_log.js';

export type SerializedLogUser = {
    id: number;
    email: string;
    logs?: SerializedLog[];
    updatedAt?: string;
    createdAt?: string;
};

export default SerializedLogUser;
