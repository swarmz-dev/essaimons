import type { SerializedFile } from './serialized_file.js';

export type SerializedOrganizationSettings = {
    name: string | null;
    description: string | null;
    sourceCodeUrl: string | null;
    copyright: string | null;
    logo: SerializedFile | null;
};
