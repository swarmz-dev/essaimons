import type { SerializedUserSummary } from './serialized_user_summary.js';
import { DeliverableVerdictEnum } from '../enum/deliverable_verdict_enum.js';

export type SerializedDeliverableEvaluation = {
    id: string;
    deliverableId: string;
    evaluatorUserId: string;
    verdict: DeliverableVerdictEnum;
    comment?: string | null;
    recordedAt: string;
    createdAt?: string;
    updatedAt?: string;
    evaluator?: SerializedUserSummary;
};
