import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { inject } from '@adonisjs/core';
import DeadlineReminderService from '#services/deadline_reminder_service';

@inject()
export default class SendDeadlineReminders extends BaseCommand {
    static commandName = 'send:deadline-reminders';
    static description = 'Send deadline reminder notifications';

    static options: CommandOptions = {
        startApp: true,
    };

    @flags.string({ description: 'Reminder type to send (48h, 24h, weekly, quorum, all)' })
    declare type: string;

    constructor(private deadlineReminderService: DeadlineReminderService) {
        super();
    }

    async run() {
        const type = this.type || 'all';

        this.logger.info(`Sending deadline reminders (type: ${type})...`);

        try {
            switch (type) {
                case '48h':
                    await this.deadlineReminderService.send48HourReminders();
                    this.logger.success('48-hour reminders sent');
                    break;

                case '24h':
                    await this.deadlineReminderService.send24HourInitiatorReminders();
                    this.logger.success('24-hour initiator reminders sent');
                    break;

                case 'weekly':
                    await this.deadlineReminderService.sendWeeklyVoteDigest();
                    this.logger.success('Weekly vote digest sent');
                    break;

                case 'quorum':
                    await this.deadlineReminderService.sendQuorumWarnings();
                    this.logger.success('Quorum warnings sent');
                    break;

                case 'all':
                    await this.deadlineReminderService.send48HourReminders();
                    this.logger.info('✓ 48-hour reminders sent');

                    await this.deadlineReminderService.send24HourInitiatorReminders();
                    this.logger.info('✓ 24-hour initiator reminders sent');

                    await this.deadlineReminderService.sendWeeklyVoteDigest();
                    this.logger.info('✓ Weekly vote digest sent');

                    await this.deadlineReminderService.sendQuorumWarnings();
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
