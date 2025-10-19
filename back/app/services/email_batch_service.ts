import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import User from '#models/user';
import Notification from '#models/notification';
import PendingEmailNotification from '#models/pending_email_notification';
import { EmailFrequencyEnum } from '#types/enum/email_frequency_enum';
import BrevoMailService from '#services/brevo_mail_service';
import EmailTemplateService from '#services/email_template_service';
import i18nManager from '@adonisjs/i18n/services/main';

@inject()
export default class EmailBatchService {
    constructor(
        private readonly brevoMailService: BrevoMailService,
        private readonly emailTemplateService: EmailTemplateService
    ) {}

    /**
     * Queue an email notification based on user's email frequency preference
     */
    async queueEmail(user: User, notification: Notification): Promise<void> {
        const scheduledFor = this.calculateScheduledTime(user.emailFrequency);

        // Check if there's already a pending email for this notification
        const existing = await PendingEmailNotification.query().where('user_id', user.id).where('notification_id', notification.id).first();

        if (existing) {
            // Already queued, skip
            return;
        }

        await PendingEmailNotification.create({
            userId: user.id,
            notificationId: notification.id,
            scheduledFor,
            sent: false,
        });
    }

    /**
     * Calculate when an email should be sent based on frequency
     */
    private calculateScheduledTime(frequency: EmailFrequencyEnum): DateTime {
        const now = DateTime.now();

        switch (frequency) {
            case EmailFrequencyEnum.INSTANT:
                return now;
            case EmailFrequencyEnum.HOURLY:
                // Round up to next hour
                return now.plus({ hours: 1 }).startOf('hour');
            case EmailFrequencyEnum.DAILY:
                // Next day at 9 AM
                return now.plus({ days: 1 }).startOf('day').set({ hour: 9 });
            case EmailFrequencyEnum.WEEKLY:
                // Next Monday at 9 AM
                const daysUntilMonday = (8 - now.weekday) % 7 || 7;
                return now.plus({ days: daysUntilMonday }).startOf('day').set({ hour: 9 });
            default:
                return now.plus({ days: 1 }).startOf('day').set({ hour: 9 });
        }
    }

    /**
     * Process and send all pending emails that are due
     * This should be called by a cron job
     */
    async processPendingEmails(): Promise<void> {
        const now = DateTime.now();

        // Get all pending emails that are scheduled for now or earlier
        const pendingEmails = await PendingEmailNotification.query()
            .where('sent', false)
            .where('scheduled_for', '<=', now.toSQL())
            .preload('user', (userQuery) => {
                userQuery.preload('profilePicture');
            })
            .preload('notification');

        // Group by user to send batch emails
        const emailsByUser = new Map<string, PendingEmailNotification[]>();

        for (const pending of pendingEmails) {
            const userEmails = emailsByUser.get(pending.userId) || [];
            userEmails.push(pending);
            emailsByUser.set(pending.userId, userEmails);
        }

        // Send batch emails
        for (const [userId, userPendingEmails] of emailsByUser.entries()) {
            const user = userPendingEmails[0].user;
            const notifications = userPendingEmails.map((p) => p.notification);

            try {
                if (notifications.length === 1) {
                    // Send single notification email
                    await this.sendSingleNotificationEmail(user, notifications[0]);
                } else {
                    // Send digest email with multiple notifications
                    await this.sendDigestEmail(user, notifications);
                }

                // Mark all as sent
                for (const pending of userPendingEmails) {
                    pending.sent = true;
                    pending.sentAt = DateTime.now();
                    await pending.save();
                }
            } catch (error) {
                console.error(`Failed to send email to user ${userId}:`, error);
                // Continue with other users, will retry next run
            }
        }
    }

    /**
     * Send a single notification email
     */
    private async sendSingleNotificationEmail(user: User, notification: Notification): Promise<void> {
        // Default to French locale for emails
        const locale = 'fr';
        const i18n = i18nManager.locale(locale);

        // Render the email using the template service
        const { subject, htmlContent, textContent } = await this.emailTemplateService.renderSingleNotification(notification, i18n, locale);

        // Send the email with both HTML and text versions
        await this.brevoMailService.sendTransactionalEmail({
            to: [{ email: user.email, name: user.username }],
            subject,
            htmlContent,
            textContent,
        });
    }

    /**
     * Send a digest email with multiple notifications
     */
    private async sendDigestEmail(user: User, notifications: Notification[]): Promise<void> {
        // Default to French locale for emails
        const locale = 'fr';
        const i18n = i18nManager.locale(locale);

        // Render the email using the template service
        const { subject, htmlContent, textContent } = await this.emailTemplateService.renderDigestNotifications(notifications, i18n, locale);

        // Send the email with both HTML and text versions
        await this.brevoMailService.sendTransactionalEmail({
            to: [{ email: user.email, name: user.username }],
            subject,
            htmlContent,
            textContent,
        });
    }

    /**
     * Clean up old sent notifications (older than 30 days)
     */
    async cleanupOldNotifications(): Promise<void> {
        const thirtyDaysAgo = DateTime.now().minus({ days: 30 });

        await PendingEmailNotification.query().where('sent', true).where('sent_at', '<', thirtyDaysAgo.toSQL()).delete();
    }
}
