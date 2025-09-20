import type { SerializedFile } from './serialized_file.js';
import type { SerializedPropositionCategory } from './serialized_proposition_category.js';
import type { SerializedPropositionSummary } from './serialized_proposition_summary.js';
import type { SerializedUserSummary } from './serialized_user_summary.js';

export type SerializedProposition = {
    id: number;
    title: string;
    summary: string;
    detailedDescription: string;
    smartObjectives: string;
    impacts: string;
    mandatesDescription: string;
    expertise?: string | null;
    clarificationDeadline: string;
    improvementDeadline: string;
    voteDeadline: string;
    mandateDeadline: string;
    evaluationDeadline: string;
    creator: SerializedUserSummary;
    categories: SerializedPropositionCategory[];
    rescueInitiators: SerializedUserSummary[];
    associatedPropositions: SerializedPropositionSummary[];
    attachments: SerializedFile[];
    visual?: SerializedFile | null;
    createdAt?: string;
    updatedAt?: string;
};
