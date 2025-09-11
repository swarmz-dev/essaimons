import SerializedLanguage from '#types/serialized/serialized_language';

export type PaginatedLanguages = {
    languages: SerializedLanguage[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};

export default PaginatedLanguages;
