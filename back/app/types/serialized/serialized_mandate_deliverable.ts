import type { SerializedFile } from './serialized_file.js';
import type { SerializedUserSummary } from './serialized_user_summary.js';
import type { SerializedDeliverableEvaluation } from './serialized_deliverable_evaluation.js';

export type SerializedMandateDeliverable = {
    id: string;
    mandateId: string;
    fileId: string;
    uploadedByUserId: string;
    label?: string | null;
    objectiveRef?: string | null;
    autoFilename?: string | null;
    status: string;
    uploadedAt: string;
    evaluationDeadlineSnapshot?: string | null;
    nonConformityFlaggedAt?: string | null;
    metadata: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    file?: SerializedFile | null;
    uploadedBy?: SerializedUserSummary;
    evaluations?: SerializedDeliverableEvaluation[];
};
