import type { SerializedLog } from './serialized_log.js';

export type SerializedLogUser = {
    id: string;
    email: string;
    logs?: SerializedLog[];
    updatedAt?: string;
    createdAt?: string;
};
