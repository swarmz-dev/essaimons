import type { SerializedUserSummary } from './serialized_user_summary.js';
import type { SerializedMandateDeliverable } from './serialized_mandate_deliverable.js';
import type { SerializedMandateApplication } from './serialized_mandate_application.js';
import type { SerializedMandateRevocationRequest } from './serialized_mandate_revocation_request.js';
import { MandateStatusEnum } from '../enum/mandate_status_enum.js';

export type SerializedMandate = {
    id: string;
    propositionId: string;
    title: string;
    description?: string | null;
    holderUserId?: string | null;
    status: MandateStatusEnum;
    targetObjectiveRef?: string | null;
    initialDeadline?: string | null;
    currentDeadline?: string | null;
    lastStatusUpdateAt?: string | null;
    lastAutomationRunAt?: string | null;
    metadata: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    holder?: SerializedUserSummary;
    deliverables?: SerializedMandateDeliverable[];
    applications?: SerializedMandateApplication[];
    revocationRequests?: SerializedMandateRevocationRequest[];
};
