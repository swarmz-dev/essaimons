import { inject } from '@adonisjs/core';
import NotificationService from '#services/notification_service';
import { NotificationTypeEnum } from '#models/notification';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverable from '#models/mandate_deliverable';
import PropositionEvent from '#models/proposition_event';
import { PropositionStatusEnum } from '#types/enum/proposition_status_enum';
import { PropositionCommentScopeEnum } from '#types/enum/proposition_comment_scope_enum';
import transmit from '@adonisjs/transmit/services/main';
import logger from '@adonisjs/core/services/logger';

@inject()
export default class PropositionNotificationService {
    constructor(private readonly notificationService: NotificationService) {}

    /**
     * Notify about proposition status transition
     */
    public async notifyStatusTransition(proposition: Proposition, oldStatus: PropositionStatusEnum, newStatus: PropositionStatusEnum): Promise<void> {
        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const userIds: string[] = [];
        let titleKey = '';
        let messageKey = '';

        // Determine who to notify based on transition
        switch (newStatus) {
            case PropositionStatusEnum.CLARIFY:
                userIds.push(proposition.creatorId);
                titleKey = 'notifications.status_transition.to_clarify.title';
                messageKey = 'notifications.status_transition.to_clarify.message';
                break;

            case PropositionStatusEnum.AMEND:
                userIds.push(proposition.creatorId);
                userIds.push(...proposition.rescueInitiators.map((u) => u.id));
                titleKey = 'notifications.status_transition.to_amend.title';
                messageKey = 'notifications.status_transition.to_amend.message';
                break;

            case PropositionStatusEnum.VOTE:
                userIds.push(proposition.creatorId);
                userIds.push(...proposition.rescueInitiators.map((u) => u.id));
                titleKey = 'notifications.status_transition.to_vote.title';
                messageKey = 'notifications.status_transition.to_vote.message';
                break;

            case PropositionStatusEnum.MANDATE:
                userIds.push(proposition.creatorId);
                titleKey = 'notifications.status_transition.to_mandate.title';
                messageKey = 'notifications.status_transition.to_mandate.message';
                break;

            case PropositionStatusEnum.EVALUATE:
                await this.notifyMandatairesForEvaluation(proposition);
                return;

            case PropositionStatusEnum.ARCHIVED:
                userIds.push(proposition.creatorId);
                userIds.push(...proposition.rescueInitiators.map((u) => u.id));
                titleKey = 'notifications.status_transition.to_archived.title';
                messageKey = 'notifications.status_transition.to_archived.message';
                break;
        }

        if (userIds.length === 0) {
            return;
        }

        const notification = await this.notificationService.create(
            {
                type: NotificationTypeEnum.STATUS_TRANSITION,
                titleKey,
                messageKey,
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    oldStatus,
                    newStatus,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.frontId}`,
            },
            [...new Set(userIds)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: 'status_change',
            oldStatus,
            newStatus,
            updatedAt: proposition.updatedAt.toISO(),
        });

        logger.info({ propositionId: proposition.id, oldStatus, newStatus, notificationId: notification.id }, 'Status transition notification sent');
    }

    private async notifyMandatairesForEvaluation(proposition: Proposition): Promise<void> {
        await proposition.load('mandates', (query) => {
            query.preload('holder');
        });

        const mandataires = proposition.mandates.filter((m) => m.holderUserId).map((m) => m.holderUserId!);

        if (mandataires.length === 0) {
            return;
        }

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.STATUS_TRANSITION,
                titleKey: 'notifications.status_transition.to_evaluate.title',
                messageKey: 'notifications.status_transition.to_evaluate.message',
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.frontId}`,
            },
            mandataires
        );
    }

    public async notifyMandateAssignment(mandate: PropositionMandate, previousHolderId: string | null = null): Promise<void> {
        if (!mandate.holderUserId) {
            return;
        }

        await mandate.load('proposition');

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.MANDATE_ASSIGNED,
                titleKey: 'notifications.mandate_assigned.title',
                messageKey: 'notifications.mandate_assigned.message',
                data: {
                    propositionId: mandate.propositionId,
                    propositionTitle: mandate.proposition.title,
                    mandateId: mandate.id,
                    mandateTitle: mandate.title,
                },
                entityType: 'mandate',
                entityId: mandate.id,
                actionUrl: `/propositions/${mandate.proposition.frontId}`,
            },
            [mandate.holderUserId]
        );

        await this.broadcastPropositionUpdate(mandate.proposition, {
            type: 'mandate_assigned',
            mandateId: mandate.id,
            holderUserId: mandate.holderUserId,
        });

        if (previousHolderId && previousHolderId !== mandate.holderUserId) {
            await this.notifyMandateRevocation(mandate, previousHolderId);
        }
    }

    public async notifyMandateRevocation(mandate: PropositionMandate, previousHolderId: string): Promise<void> {
        await mandate.load('proposition');

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.MANDATE_REVOKED,
                titleKey: 'notifications.mandate_revoked.title',
                messageKey: 'notifications.mandate_revoked.message',
                data: {
                    propositionId: mandate.propositionId,
                    propositionTitle: mandate.proposition.title,
                    mandateId: mandate.id,
                    mandateTitle: mandate.title,
                },
                entityType: 'mandate',
                entityId: mandate.id,
                actionUrl: `/propositions/${mandate.proposition.frontId}`,
            },
            [previousHolderId]
        );

        await this.broadcastPropositionUpdate(mandate.proposition, {
            type: 'mandate_revoked',
            mandateId: mandate.id,
            previousHolderId,
        });
    }

    public async notifyDeliverableUpload(deliverable: MandateDeliverable): Promise<void> {
        await deliverable.load('mandate', (query: any) => {
            query.preload('proposition').preload('holder');
        });

        const proposition = deliverable.mandate.proposition;
        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const evaluators = [proposition.creatorId, ...proposition.rescueInitiators.map((u: any) => u.id)];

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.DELIVERABLE_UPLOADED,
                titleKey: 'notifications.deliverable_uploaded.title',
                messageKey: 'notifications.deliverable_uploaded.message',
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    mandateId: deliverable.mandateId,
                    mandateTitle: deliverable.mandate.title,
                    deliverableId: deliverable.id,
                    deliverableLabel: deliverable.label,
                },
                entityType: 'deliverable',
                entityId: deliverable.id,
                actionUrl: `/propositions/${proposition.frontId}`,
            },
            [...new Set(evaluators)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: 'deliverable_uploaded',
            mandateId: deliverable.mandateId,
            deliverableId: deliverable.id,
            deliverableLabel: deliverable.label,
        });
    }

    public async notifyDeliverableEvaluation(deliverable: MandateDeliverable): Promise<void> {
        await deliverable.load('mandate', (query: any) => {
            query.preload('proposition').preload('holder');
        });

        const mandate = deliverable.mandate;
        if (!mandate.holderUserId) {
            return;
        }

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.DELIVERABLE_EVALUATED,
                titleKey: 'notifications.deliverable_evaluated.title',
                messageKey: 'notifications.deliverable_evaluated.message',
                data: {
                    propositionId: mandate.propositionId,
                    propositionTitle: mandate.proposition.title,
                    mandateId: mandate.id,
                    mandateTitle: mandate.title,
                    deliverableId: deliverable.id,
                    deliverableLabel: deliverable.label,
                },
                entityType: 'deliverable',
                entityId: deliverable.id,
                actionUrl: `/propositions/${mandate.proposition.frontId}`,
            },
            [mandate.holderUserId]
        );

        await this.broadcastPropositionUpdate(mandate.proposition, {
            type: 'deliverable_evaluated',
            mandateId: deliverable.mandateId,
            deliverableId: deliverable.id,
        });
    }

    public async notifyCommentAdded(proposition: Proposition, comment: any, authorId: string): Promise<void> {
        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const userIds = [proposition.creatorId, ...proposition.rescueInitiators.map((u) => u.id)].filter((id) => id !== authorId);

        if (userIds.length === 0) {
            return;
        }

        // Determine notification type based on comment scope
        let notificationType = NotificationTypeEnum.COMMENT_ADDED;
        let titleKey = 'notifications.comment_added.title';
        let messageKey = 'notifications.comment_added.message';

        if (comment.scope === PropositionCommentScopeEnum.CLARIFICATION) {
            notificationType = NotificationTypeEnum.CLARIFICATION_ADDED;
            titleKey = 'notifications.clarification_added.title';
            messageKey = 'notifications.clarification_added.message';
        }

        await this.notificationService.create(
            {
                type: notificationType,
                titleKey,
                messageKey,
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    commentId: comment.id,
                    scope: comment.scope,
                    section: comment.section,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.id}#comment-${comment.id}`,
            },
            [...new Set(userIds)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: comment.scope === PropositionCommentScopeEnum.CLARIFICATION ? 'clarification_added' : 'comment_added',
            commentId: comment.id,
            scope: comment.scope,
            section: comment.section,
            authorId,
        });
    }

    public async notifyCommentUpdated(proposition: Proposition, comment: any, editorId: string): Promise<void> {
        // Only send notifications for clarification updates
        if (comment.scope !== PropositionCommentScopeEnum.CLARIFICATION) {
            return;
        }

        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const userIds = [proposition.creatorId, ...proposition.rescueInitiators.map((u) => u.id)].filter((id) => id !== editorId);

        if (userIds.length === 0) {
            return;
        }

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.CLARIFICATION_UPDATED,
                titleKey: 'notifications.clarification_updated.title',
                messageKey: 'notifications.clarification_updated.message',
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    commentId: comment.id,
                    section: comment.section,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.id}#comment-${comment.id}`,
            },
            [...new Set(userIds)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: 'clarification_updated',
            commentId: comment.id,
            section: comment.section,
            editorId,
        });
    }

    public async notifyCommentDeleted(proposition: Proposition, comment: any): Promise<void> {
        // Only send notifications for clarification deletions
        if (comment.scope !== PropositionCommentScopeEnum.CLARIFICATION) {
            return;
        }

        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const userIds = [proposition.creatorId, ...proposition.rescueInitiators.map((u) => u.id)];

        if (userIds.length === 0) {
            return;
        }

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.CLARIFICATION_DELETED,
                titleKey: 'notifications.clarification_deleted.title',
                messageKey: 'notifications.clarification_deleted.message',
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    section: comment.section,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.frontId}`,
            },
            [...new Set(userIds)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: 'clarification_deleted',
            commentId: comment.id,
            section: comment.section,
        });
    }

    public async notifyExchangeScheduled(proposition: Proposition, event: PropositionEvent): Promise<void> {
        await proposition.load('creator');
        await proposition.load('rescueInitiators');

        const userIds = [proposition.creatorId, ...proposition.rescueInitiators.map((u) => u.id)];

        if (userIds.length === 0) {
            return;
        }

        await this.notificationService.create(
            {
                type: NotificationTypeEnum.EXCHANGE_SCHEDULED,
                titleKey: 'notifications.exchange_scheduled.title',
                messageKey: 'notifications.exchange_scheduled.message',
                data: {
                    propositionId: proposition.id,
                    propositionTitle: proposition.title,
                    eventId: event.id,
                    eventTitle: event.title,
                    eventType: event.type,
                    startAt: event.startAt?.toISO(),
                    location: event.location,
                    videoLink: event.videoLink,
                },
                entityType: 'proposition',
                entityId: proposition.id,
                actionUrl: `/propositions/${proposition.id}#events`,
            },
            [...new Set(userIds)]
        );

        await this.broadcastPropositionUpdate(proposition, {
            type: 'exchange_scheduled',
            eventId: event.id,
            eventTitle: event.title,
            startAt: event.startAt?.toISO(),
        });
    }

    private async broadcastPropositionUpdate(proposition: Proposition, updateData: Record<string, any>): Promise<void> {
        const streamName = `proposition/${proposition.id}`;

        try {
            await transmit.broadcast(streamName, {
                type: 'proposition_update',
                propositionId: proposition.id,
                timestamp: new Date().toISOString(),
                ...updateData,
            });

            logger.debug({ propositionId: proposition.id, streamName, updateType: updateData.type }, 'Proposition update broadcast');
        } catch (error) {
            logger.error({ err: error, propositionId: proposition.id }, 'Failed to broadcast proposition update');
        }
    }
}
