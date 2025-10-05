import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import SettingsService from '#services/settings_service';
import NotificationListenerService from '#services/notification_listener_service';

logger.info('automation.ts: File loaded, about to define startAutomation function', {
    pid: process.pid,
    ppid: process.ppid,
    isMainThread: typeof process.send === 'undefined',
});

const startAutomation = async () => {
    logger.info('automation.ts: startAutomation function called');
    if (app.inTest || process.env.NODE_ENV === 'test') {
        logger.info('automation.ts: Skipping automation in test mode');
        return;
    }
    try {
        logger.info('automation.ts: About to create service instances');
        const automationService = await app.container.make(DeliverableAutomationService);
        const settingsService = await app.container.make(SettingsService);
        const notificationListener = await app.container.make(NotificationListenerService);

        logger.info('automation.ts: Service instances created, about to start notification listener');
        // Start notification listener for real-time SSE
        await notificationListener.start();
        logger.info('automation.ts: Notification listener start() method completed');

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
        logger.info('automation.ts: All automation tasks scheduled successfully');
    } catch (error) {
        logger.error('automation.revocation.bootstrap_failed', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
};

logger.info('automation.ts: About to call startAutomation()');
startAutomation();
logger.info('automation.ts: startAutomation() call initiated (async, may not have completed)');
