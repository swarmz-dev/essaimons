import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import EmailBatchService from '#services/email_batch_service';
import SchedulingService from '#services/scheduling_service';
import DeadlineReminderService from '#services/deadline_reminder_service';
import { JobTypeEnum } from '#types';

const startAutomation = async () => {
    // Skip automation in test mode
    if (app.inTest || process.env.NODE_ENV === 'test') {
        logger.info('Skipping automation in test mode');
        return;
    }

    // Skip automation during migrations (ace commands that don't start the HTTP server)
    // The app is considered ready when booted and not in a command context
    if (!app.isBooted) {
        logger.info('Skipping automation - app not fully booted');
        return;
    }
    try {
        const automationService = await app.container.make(DeliverableAutomationService);
        const emailBatchService = await app.container.make(EmailBatchService);
        const schedulingService = await app.container.make(SchedulingService);
        const deadlineReminderService = await app.container.make(DeadlineReminderService);

        const runSweep = async () => {
            // Check if scheduling is globally paused
            const isPaused = await schedulingService.isSchedulingPaused();
            if (isPaused) {
                logger.info('Scheduling is globally paused, skipping all jobs');
                return;
            }

            // Run deadline sweep if scheduled
            if (await schedulingService.shouldJobRun(JobTypeEnum.DEADLINE_SWEEP)) {
                const deadlineExecution = await schedulingService.startJobExecution(JobTypeEnum.DEADLINE_SWEEP);
                try {
                    const result = await automationService.runDeadlineSweep();
                    await schedulingService.completeJobExecution(deadlineExecution, result);
                } catch (error) {
                    await schedulingService.failJobExecution(deadlineExecution, error instanceof Error ? error : String(error));
                    logger.error('automation.deadline.sweep_failed', {
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }

            // Run revocation sweep if scheduled
            if (await schedulingService.shouldJobRun(JobTypeEnum.REVOCATION_SWEEP)) {
                const revocationExecution = await schedulingService.startJobExecution(JobTypeEnum.REVOCATION_SWEEP);
                try {
                    const result = await automationService.runRevocationSweep();
                    await schedulingService.completeJobExecution(revocationExecution, result);
                } catch (error) {
                    await schedulingService.failJobExecution(revocationExecution, error instanceof Error ? error : String(error));
                    logger.error('automation.revocation.sweep_failed', {
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }

            // Run email batch if scheduled
            if (await schedulingService.shouldJobRun(JobTypeEnum.EMAIL_BATCH)) {
                const emailExecution = await schedulingService.startJobExecution(JobTypeEnum.EMAIL_BATCH);
                try {
                    const result = await emailBatchService.processPendingEmails();
                    await schedulingService.completeJobExecution(emailExecution, result);
                } catch (error) {
                    await schedulingService.failJobExecution(emailExecution, error instanceof Error ? error : String(error));
                    logger.error('automation.email.batch_failed', {
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }

            // Run deadline reminders if scheduled
            if (await schedulingService.shouldJobRun(JobTypeEnum.DEADLINE_REMINDERS)) {
                const reminderExecution = await schedulingService.startJobExecution(JobTypeEnum.DEADLINE_REMINDERS);
                try {
                    // Run all deadline reminder types
                    await deadlineReminderService.send48HourReminders();
                    await deadlineReminderService.send24HourInitiatorReminders();
                    await deadlineReminderService.sendQuorumWarnings();
                    await deadlineReminderService.sendWeeklyVoteDigest();

                    await schedulingService.completeJobExecution(reminderExecution, {
                        message: 'All deadline reminders sent successfully',
                    });
                } catch (error) {
                    await schedulingService.failJobExecution(reminderExecution, error instanceof Error ? error : String(error));
                    logger.error('automation.deadline_reminders.failed', {
                        error: error instanceof Error ? error.message : error,
                    });
                }
            }
        };

        const scheduleNext = async () => {
            // Check every minute to see if any job needs to run
            // This allows for fine-grained scheduling based on individual job intervals
            const checkIntervalMs = 60 * 1000; // 1 minute
            setTimeout(async () => {
                await runSweep();
                await scheduleNext();
            }, checkIntervalMs);
        };

        // Temporarily disabled for debugging
        // await runSweep();
        await scheduleNext();
    } catch (error) {
        logger.error('automation.bootstrap_failed', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

startAutomation();
