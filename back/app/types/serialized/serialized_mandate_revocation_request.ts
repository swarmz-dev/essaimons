import type { SerializedUserSummary } from './serialized_user_summary.js';
import { MandateRevocationStatusEnum } from '../enum/mandate_revocation_status_enum.js';

export type SerializedMandateRevocationRequest = {
    id: string;
    mandateId: string;
    initiatedByUserId: string;
    reason?: string | null;
    status: MandateRevocationStatusEnum;
    voteId?: string | null;
    createdAt: string;
    resolvedAt?: string | null;
    updatedAt?: string;
    initiatedBy?: SerializedUserSummary;
};
