import type { SerializedPropositionCategory } from './serialized_proposition_category.js';
import type { SerializedUserSummary } from './serialized_user_summary.js';
import type { SerializedFile } from './serialized_file.js';

export type SerializedPropositionListItem = {
    id: string;
    title: string;
    summary: string;
    categories: SerializedPropositionCategory[];
    clarificationDeadline: string;
    improvementDeadline: string;
    voteDeadline: string;
    mandateDeadline: string;
    evaluationDeadline: string;
    createdAt?: string;
    updatedAt?: string;
    visual?: SerializedFile | null;
    creator?: SerializedUserSummary;
};
