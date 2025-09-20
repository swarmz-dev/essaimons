import type { SerializedPropositionCategory } from './serialized_proposition_category.js';
import type { SerializedPropositionSummary } from './serialized_proposition_summary.js';
import type { SerializedUserSummary } from './serialized_user_summary.js';

export type SerializedPropositionBootstrap = {
    categories: SerializedPropositionCategory[];
    propositions: SerializedPropositionSummary[];
    users: SerializedUserSummary[];
};
