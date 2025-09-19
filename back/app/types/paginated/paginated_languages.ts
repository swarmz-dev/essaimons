import type { SerializedLanguage } from '../serialized/serialized_language.js';

export type PaginatedLanguages = {
    languages: SerializedLanguage[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};
