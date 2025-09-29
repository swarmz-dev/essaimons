import type { SerializedUserSummary } from './serialized_user_summary.js';
import { MandateApplicationStatusEnum } from '../enum/mandate_application_status_enum.js';

export type SerializedMandateApplication = {
    id: string;
    mandateId: string;
    applicantUserId: string;
    statement?: string | null;
    status: MandateApplicationStatusEnum;
    submittedAt: string;
    createdAt?: string;
    updatedAt?: string;
    applicant?: SerializedUserSummary;
};
