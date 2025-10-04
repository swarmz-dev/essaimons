import type { SerializedPropositionCategory } from './serialized_proposition_category.js';
import type { SerializedUserSummary } from './serialized_user_summary.js';
import type { SerializedFile } from './serialized_file.js';
import { PropositionStatusEnum } from '../enum/proposition_status_enum.js';
import { PropositionVisibilityEnum } from '../enum/proposition_visibility_enum.js';

export type SerializedPropositionListItem = {
    id: string;
    title: string;
    summary: string;
    categories: SerializedPropositionCategory[];
    status: PropositionStatusEnum;
    visibility: PropositionVisibilityEnum;
    statusStartedAt: string;
    clarificationDeadline: string;
    amendmentDeadline: string;
    voteDeadline: string;
    mandateDeadline: string;
    evaluationDeadline: string;
    archivedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    visual?: SerializedFile | null;
    creator?: SerializedUserSummary;
};
