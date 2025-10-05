import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import SettingsService from '#services/settings_service';
import EmailBatchService from '#services/email_batch_service';

const startAutomation = async () => {
    if (app.inTest || process.env.NODE_ENV === 'test') {
        logger.info('Skipping automation in test mode');
        return;
    }
    try {
        const automationService = await app.container.make(DeliverableAutomationService);
        const settingsService = await app.container.make(SettingsService);
        const emailBatchService = await app.container.make(EmailBatchService);

        const runSweep = async () => {
            try {
                await automationService.runDeadlineSweep();
            } catch (error) {
                logger.error('automation.deadline.sweep_failed', {
                    error: error instanceof Error ? error.message : error,
                });
            }

            try {
                await automationService.runRevocationSweep();
            } catch (error) {
                logger.error('automation.revocation.sweep_failed', {
                    error: error instanceof Error ? error.message : error,
                });
            }

            try {
                await emailBatchService.processPendingEmails();
            } catch (error) {
                logger.error('automation.email.batch_failed', {
                    error: error instanceof Error ? error.message : error,
                });
            }
        };

        const scheduleNext = async () => {
            const settings = await settingsService.getOrganizationSettings();
            const interval = automationService.getRevocationSweepIntervalMs(settings.workflowAutomation?.revocationCheckFrequencyHours ?? 24);
            setTimeout(async () => {
                await runSweep();
                await scheduleNext();
            }, interval);
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
