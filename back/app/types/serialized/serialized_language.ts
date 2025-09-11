import SerializedFile from '#types/serialized/serialized_file';

export type SerializedLanguage = {
    name: string;
    code: string;
    isFallback: boolean;
    flag: SerializedFile;
    updatedAt?: string;
    createdAt?: string;
};

export default SerializedLanguage;
