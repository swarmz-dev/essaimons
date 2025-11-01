import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import DeadlineReminderService from '#services/deadline_reminder_service';

export default class SendDeadlineReminders extends BaseCommand {
    static commandName = 'send:deadline-reminders';
    static description = 'Send deadline reminder notifications';

    static options: CommandOptions = {
        startApp: true,
    };

    @flags.string({ description: 'Reminder type to send (48h, 24h, weekly, quorum, all)' })
    declare type: string;

    async run() {
        const deadlineReminderService = await this.app.container.make(DeadlineReminderService);
        const type = this.type || 'all';

        this.logger.info(`Sending deadline reminders (type: ${type})...`);

        try {
            switch (type) {
                case '48h':
                    await deadlineReminderService.send48HourReminders();
                    this.logger.success('48-hour reminders sent');
                    break;

                case '24h':
                    await deadlineReminderService.send24HourInitiatorReminders();
                    this.logger.success('24-hour initiator reminders sent');
                    break;

                case 'weekly':
                    await deadlineReminderService.sendWeeklyVoteDigest();
                    this.logger.success('Weekly vote digest sent');
                    break;

                case 'quorum':
                    await deadlineReminderService.sendQuorumWarnings();
                    this.logger.success('Quorum warnings sent');
                    break;

                case 'all':
                    await deadlineReminderService.send48HourReminders();
                    this.logger.info('✓ 48-hour reminders sent');

                    await deadlineReminderService.send24HourInitiatorReminders();
                    this.logger.info('✓ 24-hour initiator reminders sent');

                    await deadlineReminderService.sendWeeklyVoteDigest();
                    this.logger.info('✓ Weekly vote digest sent');

                    await deadlineReminderService.sendQuorumWarnings();
                    this.logger.info('✓ Quorum warnings sent');

                    this.logger.success('All deadline reminders sent');
                    break;

                default:
                    this.logger.error(`Unknown type: ${type}. Use: 48h, 24h, weekly, quorum, or all`);
                    return;
            }
        } catch (error) {
            this.logger.error(`Failed to send deadline reminders: ${error.message}`);
            throw error;
        }
    }
}
