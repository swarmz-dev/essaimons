import type {
    MandateApplicationStatusEnum,
    MandateStatusEnum,
    DeliverableVerdictEnum,
    PropositionCommentScopeEnum,
    PropositionCommentVisibilityEnum,
    PropositionEventTypeEnum,
    PropositionStatusEnum,
    PropositionVoteMethodEnum,
    PropositionVotePhaseEnum,
    PropositionVoteStatusEnum,
    SerializedFile,
    SerializedProposition,
    SerializedPropositionListItem,
    SerializedUserSummary,
} from 'backend/types';

export type WorkflowRole = 'admin' | 'initiator' | 'mandated' | 'contributor';

export type PropositionEvent = {
    id: string;
    propositionId: string;
    type: PropositionEventTypeEnum;
    title: string;
    description?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    location?: string | null;
    videoLink?: string | null;
    createdByUserId?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type VoteOption = {
    id: string;
    voteId: string;
    label: string;
    description?: string | null;
    position: number;
    metadata: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
};

export type PropositionVote = {
    id: string;
    propositionId: string;
    phase: PropositionVotePhaseEnum;
    method: PropositionVoteMethodEnum;
    title: string;
    description?: string | null;
    openAt?: string | null;
    closeAt?: string | null;
    maxSelections?: number | null;
    status: PropositionVoteStatusEnum;
    metadata: Record<string, unknown>;
    options: VoteOption[];
    createdAt?: string;
    updatedAt?: string;
};

export type DeliverableEvaluation = {
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

export type MandateDeliverable = {
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
    file?: SerializedFile;
    uploadedBy?: SerializedUserSummary;
    evaluations?: DeliverableEvaluation[];
    createdAt?: string;
    updatedAt?: string;
};

export type MandateApplication = {
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

export type MandateRevocationRequest = {
    id: string;
    mandateId: string;
    voteId?: string | null;
    reason: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
};

export type PropositionMandate = {
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
    deliverables?: MandateDeliverable[];
    applications?: MandateApplication[];
    revocationRequests?: MandateRevocationRequest[];
};

export type PropositionComment = {
    id: string;
    propositionId: string;
    parentId?: string | null;
    authorId: string;
    scope: PropositionCommentScopeEnum;
    visibility: PropositionCommentVisibilityEnum;
    content: string;
    createdAt: string;
    updatedAt?: string;
    author?: SerializedUserSummary;
    replies?: PropositionComment[];
};

export type PropositionTimelinePhase = {
    key: PropositionStatusEnum;
    label: string;
    deadline?: string | null;
    completed: boolean;
    isCurrent: boolean;
    extra?: {
        deliverableCount?: number;
        overdueDeliverableCount?: number;
        voteStatus?: PropositionVoteStatusEnum;
    };
};

export type PropositionDetailPayload = {
    proposition: SerializedProposition;
    events: PropositionEvent[];
    votes: PropositionVote[];
    mandates: PropositionMandate[];
    comments: PropositionComment[];
};

export type PropositionListFilters = {
    statuses: PropositionStatusEnum[];
};

export type PropositionListResponse = {
    propositions: SerializedPropositionListItem[];
    filters: {
        categories: SerializedProposition['categories'];
        statuses: PropositionStatusEnum[];
    };
};
