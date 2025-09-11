import type { FileTypeEnum } from '../enum/file_type_enum.js';

export type SerializedFile = {
    name: string;
    path: string;
    extension: string;
    mimeType: string;
    size: number;
    type: FileTypeEnum;
    createdAt?: string;
    updatedAt?: string;
};

export default SerializedFile;
