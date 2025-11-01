import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import Proposition from '#models/proposition';
import PropositionVote from '#models/proposition_vote';
import User from '#models/user';
import DeadlineReminderSent from '#models/deadline_reminder_sent';
import NotificationService from '#services/notification_service';
import { NotificationTypeEnum, PropositionStatusEnum, PropositionVoteStatusEnum } from '#types';

@inject()
export default class DeadlineReminderService {
    constructor(private readonly notificationService: NotificationService) {}

    /**
     * Send 48-hour reminders to all contributors for approaching deadlines
     */
    public async send48HourReminders(): Promise<void> {
        try {
            logger.info('Starting 48-hour deadline reminders');

            const now = DateTime.now();
            const lowerBound = now.plus({ hours: 47 });
            const upperBound = now.plus({ hours: 49 });

            const propositions = await Proposition.query()
                .whereNotNull('clarification_deadline')
                .orWhereNotNull('amendment_deadline')
                .orWhereNotNull('vote_deadline')
                .orWhereNotNull('mandate_deadline')
                .orWhereNotNull('evaluation_deadline');

            for (const proposition of propositions) {
                const deadlines = [
                    { type: 'clarification', deadline: proposition.clarificationDeadline },
                    { type: 'amendment', deadline: proposition.amendmentDeadline },
                    { type: 'vote', deadline: proposition.voteDeadline },
                    { type: 'mandate', deadline: proposition.mandateDeadline },
                    { type: 'evaluation', deadline: proposition.evaluationDeadline },
                ];

                for (const { type, deadline } of deadlines) {
                    if (!deadline) continue;

                    const deadlineDateTime = deadline.startOf('day');
                    if (deadlineDateTime >= lowerBound && deadlineDateTime <= upperBound) {
                        const alreadySent = await this.hasReminderBeenSent(proposition.id, '48h', type, deadlineDateTime);

                        if (!alreadySent) {
                            const contributorIds = await this.getContributors(proposition);

                            if (contributorIds.length > 0) {
                                await this.notificationService.create(
                                    {
                                        type: NotificationTypeEnum.DEADLINE_REMINDER_48H,
                                        titleKey: 'notification.deadline_reminder_48h.title',
                                        messageKey: 'notification.deadline_reminder_48h.message',
                                        data: {
                                            propositionTitle: proposition.title,
                                            deadlineType: type,
                                            deadlineDate: deadlineDateTime.toISODate(),
                                        },
                                        entityType: 'proposition',
                                        entityId: proposition.id,
                                        actionUrl: `/propositions/${proposition.id}`,
                                    },
                                    contributorIds
                                );

                                await this.recordReminderSent(proposition.id, '48h', type, deadlineDateTime);

                                logger.info(
                                    {
                                        propositionId: proposition.id,
                                        deadlineType: type,
                                        recipientCount: contributorIds.length,
                                    },
                                    '48-hour reminder sent'
                                );
                            }
                        }
                    }
                }
            }

            logger.info('Completed 48-hour deadline reminders');
        } catch (error) {
            logger.error({ err: error }, 'Failed to send 48-hour deadline reminders');
            throw error;
        }
    }

    /**
     * Send 24-hour reminders to initiators only for approaching deadlines
     */
    public async send24HourInitiatorReminders(): Promise<void> {
        try {
            logger.info('Starting 24-hour initiator deadline reminders');

            const now = DateTime.now();
            const lowerBound = now.plus({ hours: 23 });
            const upperBound = now.plus({ hours: 25 });

            const propositions = await Proposition.query()
                .preload('creator')
                .preload('rescueInitiators')
                .whereNotNull('clarification_deadline')
                .orWhereNotNull('amendment_deadline')
                .orWhereNotNull('vote_deadline')
                .orWhereNotNull('mandate_deadline')
                .orWhereNotNull('evaluation_deadline');

            for (const proposition of propositions) {
                const deadlines = [
                    { type: 'clarification', deadline: proposition.clarificationDeadline },
                    { type: 'amendment', deadline: proposition.amendmentDeadline },
                    { type: 'vote', deadline: proposition.voteDeadline },
                    { type: 'mandate', deadline: proposition.mandateDeadline },
                    { type: 'evaluation', deadline: proposition.evaluationDeadline },
                ];

                for (const { type, deadline } of deadlines) {
                    if (!deadline) continue;

                    const deadlineDateTime = deadline.startOf('day');
                    if (deadlineDateTime >= lowerBound && deadlineDateTime <= upperBound) {
                        const alreadySent = await this.hasReminderBeenSent(proposition.id, '24h_initiator', type, deadlineDateTime);

                        if (!alreadySent) {
                            // Get only creator and rescue initiators
                            const initiatorIds: string[] = [proposition.creatorId];
                            if (proposition.rescueInitiators && proposition.rescueInitiators.length > 0) {
                                initiatorIds.push(...proposition.rescueInitiators.map((u) => u.id));
                            }

                            const uniqueInitiatorIds = [...new Set(initiatorIds)];

                            if (uniqueInitiatorIds.length > 0) {
                                await this.notificationService.create(
                                    {
                                        type: NotificationTypeEnum.DEADLINE_REMINDER_24H_INITIATOR,
                                        titleKey: 'notification.deadline_reminder_24h_initiator.title',
                                        messageKey: 'notification.deadline_reminder_24h_initiator.message',
                                        data: {
                                            propositionTitle: proposition.title,
                                            deadlineType: type,
                                            deadlineDate: deadlineDateTime.toISODate(),
                                        },
                                        entityType: 'proposition',
                                        entityId: proposition.id,
                                        actionUrl: `/propositions/${proposition.id}`,
                                    },
                                    uniqueInitiatorIds
                                );

                                await this.recordReminderSent(proposition.id, '24h_initiator', type, deadlineDateTime);

                                logger.info(
                                    {
                                        propositionId: proposition.id,
                                        deadlineType: type,
                                        recipientCount: uniqueInitiatorIds.length,
                                    },
                                    '24-hour initiator reminder sent'
                                );
                            }
                        }
                    }
                }
            }

            logger.info('Completed 24-hour initiator deadline reminders');
        } catch (error) {
            logger.error({ err: error }, 'Failed to send 24-hour initiator deadline reminders');
            throw error;
        }
    }

    /**
     * Send weekly digest of all open/upcoming votes to all active users
     */
    public async sendWeeklyVoteDigest(): Promise<void> {
        try {
            logger.info('Starting weekly vote digest');

            const now = DateTime.now();
            const nextWeek = now.plus({ days: 7 });

            // Find all open votes or votes scheduled to open in the next 7 days
            const votes = await PropositionVote.query()
                .preload('proposition')
                .where((query) => {
                    query.where('status', PropositionVoteStatusEnum.OPEN).orWhere((subQuery) => {
                        subQuery.where('status', PropositionVoteStatusEnum.SCHEDULED).whereBetween('open_at', [now.toSQL(), nextWeek.toSQL()]);
                    });
                })
                .orderBy('close_at', 'asc');

            if (votes.length === 0) {
                logger.info('No open or upcoming votes found for weekly digest');
                return;
            }

            // Get all active users
            const users = await User.query().where('enabled', true);

            if (users.length === 0) {
                logger.info('No active users found for weekly digest');
                return;
            }

            const userIds = users.map((u) => u.id);

            // Prepare vote data for the notification
            const voteData = votes.map((vote) => ({
                id: vote.id,
                title: vote.title,
                propositionTitle: vote.proposition?.title || 'Unknown',
                propositionId: vote.propositionId,
                status: vote.status,
                openAt: vote.openAt?.toISO(),
                closeAt: vote.closeAt?.toISO(),
            }));

            // Create ONE notification with list of all votes
            await this.notificationService.create(
                {
                    type: NotificationTypeEnum.WEEKLY_VOTE_DIGEST,
                    titleKey: 'notification.weekly_vote_digest.title',
                    messageKey: 'notification.weekly_vote_digest.message',
                    data: {
                        voteCount: votes.length,
                        votes: voteData,
                    },
                    actionUrl: '/votes',
                },
                userIds
            );

            logger.info(
                {
                    voteCount: votes.length,
                    recipientCount: userIds.length,
                },
                'Weekly vote digest sent'
            );
        } catch (error) {
            logger.error({ err: error }, 'Failed to send weekly vote digest');
            throw error;
        }
    }

    /**
     * Send quorum warnings for votes closing soon without reaching quorum
     */
    public async sendQuorumWarnings(): Promise<void> {
        try {
            logger.info('Starting quorum warnings');

            const now = DateTime.now();
            const lowerBound = now.plus({ hours: 47 });
            const upperBound = now.plus({ hours: 49 });

            const votes = await PropositionVote.query()
                .preload('proposition')
                .preload('ballots')
                .where('status', PropositionVoteStatusEnum.OPEN)
                .whereBetween('close_at', [lowerBound.toSQL(), upperBound.toSQL()]);

            for (const vote of votes) {
                const alreadySent = await this.hasReminderBeenSent(vote.propositionId, 'quorum_warning', 'vote', vote.closeAt || DateTime.now());

                if (alreadySent) continue;

                // Get required participation from settings snapshot
                const settingsSnapshot = vote.proposition?.settingsSnapshot || {};
                const requiredParticipation = (settingsSnapshot.requiredParticipation as number) || 0.5;

                // Count total eligible voters (all enabled users)
                const totalEligibleVoters = await User.query().where('enabled', true).count('* as total');
                const totalEligible = Number(totalEligibleVoters[0].$extras.total);

                // Count ballots cast
                const ballotsCount = vote.ballots?.length || 0;

                // Calculate quorum threshold
                const quorumThreshold = Math.ceil(totalEligible * requiredParticipation);

                // Check if quorum is NOT reached
                if (ballotsCount < quorumThreshold) {
                    // Get users who have already voted
                    const voterIds = vote.ballots?.map((b) => b.voterId) || [];

                    // Get eligible voters who haven't voted yet
                    const eligibleNonVoters = await User.query().where('enabled', true).whereNotIn('id', voterIds);

                    const eligibleNonVoterIds = eligibleNonVoters.map((u) => u.id);

                    if (eligibleNonVoterIds.length > 0) {
                        await this.notificationService.create(
                            {
                                type: NotificationTypeEnum.VOTE_QUORUM_WARNING,
                                titleKey: 'notification.vote_quorum_warning.title',
                                messageKey: 'notification.vote_quorum_warning.message',
                                data: {
                                    voteTitle: vote.title,
                                    propositionTitle: vote.proposition?.title || 'Unknown',
                                    currentVotes: ballotsCount,
                                    requiredVotes: quorumThreshold,
                                    closeAt: vote.closeAt?.toISO(),
                                },
                                entityType: 'vote',
                                entityId: vote.id,
                                actionUrl: `/propositions/${vote.propositionId}/votes/${vote.id}`,
                            },
                            eligibleNonVoterIds
                        );

                        await this.recordReminderSent(vote.propositionId, 'quorum_warning', 'vote', vote.closeAt || DateTime.now());

                        logger.info(
                            {
                                voteId: vote.id,
                                currentVotes: ballotsCount,
                                requiredVotes: quorumThreshold,
                                recipientCount: eligibleNonVoterIds.length,
                            },
                            'Quorum warning sent'
                        );
                    }
                }
            }

            logger.info('Completed quorum warnings');
        } catch (error) {
            logger.error({ err: error }, 'Failed to send quorum warnings');
            throw error;
        }
    }

    /**
     * Get all contributors for a proposition (creator, rescue initiators, mandate holders, commenters, voters)
     */
    private async getContributors(proposition: Proposition): Promise<string[]> {
        const contributorIds: Set<string> = new Set();

        // Add creator
        contributorIds.add(proposition.creatorId);

        // Add rescue initiators
        await proposition.load('rescueInitiators');
        if (proposition.rescueInitiators) {
            proposition.rescueInitiators.forEach((user) => contributorIds.add(user.id));
        }

        // Add mandate holders
        await proposition.load('mandates');
        if (proposition.mandates) {
            proposition.mandates.forEach((mandate) => {
                if (mandate.holderUserId) {
                    contributorIds.add(mandate.holderUserId);
                }
            });
        }

        // Add commenters
        await proposition.load('comments');
        if (proposition.comments) {
            proposition.comments.forEach((comment) => contributorIds.add(comment.authorId));
        }

        // Add voters (from related votes)
        await proposition.load('votes', (votesQuery) => {
            votesQuery.preload('ballots');
        });
        if (proposition.votes) {
            proposition.votes.forEach((vote) => {
                if (vote.ballots) {
                    vote.ballots.forEach((ballot) => contributorIds.add(ballot.voterId));
                }
            });
        }

        return Array.from(contributorIds);
    }

    /**
     * Check if a reminder has already been sent
     */
    private async hasReminderBeenSent(propositionId: string, reminderType: string, deadlineType: string, deadlineAt: DateTime): Promise<boolean> {
        const existing = await DeadlineReminderSent.query()
            .where('proposition_id', propositionId)
            .where('reminder_type', reminderType)
            .where('deadline_type', deadlineType)
            .where('deadline_at', deadlineAt.toSQL())
            .first();

        return existing !== null;
    }

    /**
     * Record that a reminder has been sent
     */
    private async recordReminderSent(propositionId: string, reminderType: string, deadlineType: string, deadlineAt: DateTime): Promise<void> {
        await DeadlineReminderSent.create({
            propositionId,
            reminderType,
            deadlineType,
            deadlineAt,
            sentAt: DateTime.now(),
        });
    }
}
