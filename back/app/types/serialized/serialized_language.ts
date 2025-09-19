import type { SerializedFile } from './serialized_file.js';

export type SerializedLanguage = {
    name: string;
    code: string;
    isFallback: boolean;
    flag: SerializedFile;
    updatedAt?: string;
    createdAt?: string;
};
