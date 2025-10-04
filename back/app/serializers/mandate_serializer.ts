import { DateTime } from 'luxon';
import MandateDeliverable from '#models/mandate_deliverable';
import DeliverableEvaluation from '#models/deliverable_evaluation';
import MandateApplication from '#models/mandate_application';
import MandateRevocationRequest from '#models/mandate_revocation_request';
import PropositionMandate from '#models/proposition_mandate';
import User from '#models/user';
import type { SerializedDeliverableEvaluation, SerializedMandate, SerializedMandateApplication, SerializedMandateDeliverable, SerializedMandateRevocationRequest } from '#types';

const toIso = (value?: DateTime | null): string | null => (value ? value.toISO() : null);

const serializeUserSummary = (user?: User | null) => {
    if (!user) {
        console.warn('serializeUserSummary called with undefined/null user');
        return undefined;
    }
    return user.summarySerialize();
};

export function serializeDeliverableEvaluation(evaluation: DeliverableEvaluation): SerializedDeliverableEvaluation {
    return {
        id: evaluation.id,
        deliverableId: evaluation.deliverableId,
        evaluatorUserId: evaluation.evaluatorUserId,
        verdict: evaluation.verdict,
        comment: evaluation.comment ?? null,
        recordedAt: evaluation.recordedAt?.toISO() ?? new Date().toISOString(),
        createdAt: toIso(evaluation.createdAt) ?? undefined,
        updatedAt: toIso(evaluation.updatedAt) ?? undefined,
        evaluator: serializeUserSummary(evaluation.evaluator as User | undefined),
    };
}

export function serializeMandateDeliverable(deliverable: MandateDeliverable): SerializedMandateDeliverable {
    // Debug logging
    if (!deliverable.uploadedBy && deliverable.uploadedByUserId) {
        console.error('ERROR: uploadedBy is undefined but uploadedByUserId exists:', deliverable.uploadedByUserId);
        console.error('Preloaded relations:', Object.keys(deliverable.$preloaded || {}));
    }

    return {
        id: deliverable.id,
        mandateId: deliverable.mandateId,
        fileId: deliverable.fileId,
        uploadedByUserId: deliverable.uploadedByUserId,
        label: deliverable.label ?? null,
        objectiveRef: deliverable.objectiveRef ?? null,
        autoFilename: deliverable.autoFilename ?? null,
        status: deliverable.status,
        uploadedAt: deliverable.uploadedAt?.toISO() ?? new Date().toISOString(),
        evaluationDeadlineSnapshot: toIso(deliverable.evaluationDeadlineSnapshot) ?? null,
        nonConformityFlaggedAt: toIso(deliverable.nonConformityFlaggedAt) ?? null,
        metadata: deliverable.metadata ?? {},
        createdAt: toIso(deliverable.createdAt) ?? undefined,
        updatedAt: toIso(deliverable.updatedAt) ?? undefined,
        file: deliverable.file?.apiSerialize() ?? null,
        uploadedBy: serializeUserSummary(deliverable.uploadedBy as User | undefined),
        evaluations: (deliverable.evaluations ?? []).map(serializeDeliverableEvaluation),
    };
}

export function serializeMandateApplication(application: MandateApplication): SerializedMandateApplication {
    return {
        id: application.id,
        mandateId: application.mandateId,
        applicantUserId: application.applicantUserId,
        statement: application.statement ?? null,
        status: application.status,
        submittedAt: application.submittedAt?.toISO() ?? new Date().toISOString(),
        createdAt: toIso(application.createdAt) ?? undefined,
        updatedAt: toIso(application.updatedAt) ?? undefined,
        applicant: serializeUserSummary(application.applicant as User | undefined),
    };
}

export function serializeMandateRevocationRequest(request: MandateRevocationRequest): SerializedMandateRevocationRequest {
    return {
        id: request.id,
        mandateId: request.mandateId,
        initiatedByUserId: request.initiatedByUserId,
        reason: request.reason ?? null,
        status: request.status,
        voteId: request.voteId ?? null,
        createdAt: request.createdAt?.toISO() ?? new Date().toISOString(),
        resolvedAt: toIso(request.resolvedAt) ?? undefined,
        updatedAt: toIso(request.updatedAt) ?? undefined,
        initiatedBy: serializeUserSummary(request.initiatedBy as User | undefined),
    };
}

export function serializeMandate(mandate: PropositionMandate): SerializedMandate {
    // Check if relations are preloaded before accessing them
    const holderPreloaded = mandate.$preloaded?.holder !== undefined;
    const deliverablesPreloaded = mandate.$preloaded?.deliverables !== undefined;
    const applicationsPreloaded = mandate.$preloaded?.applications !== undefined;
    const revocationRequestsPreloaded = mandate.$preloaded?.revocationRequests !== undefined;

    return {
        id: mandate.id,
        propositionId: mandate.propositionId,
        title: mandate.title,
        description: mandate.description ?? null,
        holderUserId: mandate.holderUserId ?? null,
        status: mandate.status,
        targetObjectiveRef: mandate.targetObjectiveRef ?? null,
        initialDeadline: toIso(mandate.initialDeadline) ?? null,
        currentDeadline: toIso(mandate.currentDeadline) ?? null,
        lastStatusUpdateAt: toIso(mandate.lastStatusUpdateAt) ?? null,
        lastAutomationRunAt: toIso(mandate.lastAutomationRunAt) ?? undefined,
        metadata: mandate.metadata ?? {},
        createdAt: toIso(mandate.createdAt) ?? undefined,
        updatedAt: toIso(mandate.updatedAt) ?? undefined,
        holder: holderPreloaded ? serializeUserSummary(mandate.holder as User | undefined) : undefined,
        deliverables: deliverablesPreloaded ? (mandate.deliverables ?? []).map(serializeMandateDeliverable) : [],
        applications: applicationsPreloaded ? (mandate.applications ?? []).map(serializeMandateApplication) : [],
        revocationRequests: revocationRequestsPreloaded ? (mandate.revocationRequests ?? []).map(serializeMandateRevocationRequest) : [],
    };
}
