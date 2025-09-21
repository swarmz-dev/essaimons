import type { SerializedPropositionListItem } from '../serialized/serialized_proposition_list_item.js';

export type PaginatedPropositions = {
    propositions: SerializedPropositionListItem[];
    firstPage: number;
    lastPage: number;
    limit: number;
    total: number;
    currentPage: number;
};
