import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import SchedulingService from '#services/scheduling_service';
import EmailBatchService from '#services/email_batch_service';
import DeliverableAutomationService from '#services/deliverable_automation_service';
import { JobTypeEnum } from '#types';

@inject()
export default class SchedulingController {
    constructor(
        private readonly schedulingService: SchedulingService,
        private readonly emailBatchService: EmailBatchService,
        private readonly deliverableAutomationService: DeliverableAutomationService
    ) {}

    /**
     * GET /admin/scheduling
     * Get scheduling status and all job statistics
     */
    public async index({ response }: HttpContext): Promise<void> {
        const isPaused = await this.schedulingService.isSchedulingPaused();
        const stats = await this.schedulingService.getAllJobStatistics();

        return response.ok({
            isPaused,
            jobs: stats,
        });
    }

    /**
     * PUT /admin/scheduling/pause
     * Pause or resume scheduling
     */
    public async setPaused({ request, response }: HttpContext): Promise<void> {
        const { paused } = request.only(['paused']);

        if (typeof paused !== 'boolean') {
            return response.badRequest({
                error: 'paused must be a boolean',
            });
        }

        await this.schedulingService.setSchedulingPaused(paused);

        return response.ok({
            isPaused: paused,
            message: `Scheduling ${paused ? 'paused' : 'resumed'}`,
        });
    }

    /**
     * GET /admin/scheduling/jobs/:jobType
     * Get detailed statistics for a specific job
     */
    public async show({ request, response }: HttpContext): Promise<void> {
        const jobType = request.param('jobType') as JobTypeEnum;

        if (!Object.values(JobTypeEnum).includes(jobType)) {
            return response.badRequest({
                error: 'Invalid job type',
            });
        }

        const stats = await this.schedulingService.getJobStatistics(jobType, 100);

        return response.ok({
            jobType,
            ...stats,
        });
    }

    /**
     * POST /admin/scheduling/jobs/:jobType/trigger
     * Manually trigger a job
     */
    public async trigger({ request, response }: HttpContext): Promise<void> {
        const jobType = request.param('jobType') as JobTypeEnum;

        if (!Object.values(JobTypeEnum).includes(jobType)) {
            return response.badRequest({
                error: 'Invalid job type',
            });
        }

        // Check if job is already running
        if (this.schedulingService.isJobRunning(jobType)) {
            return response.badRequest({
                error: 'Job is already running',
            });
        }

        // Start execution tracking
        const execution = await this.schedulingService.startJobExecution(jobType, {
            manual: true,
        });

        // Run the job
        try {
            let metadata: Record<string, any> | undefined;

            switch (jobType) {
                case JobTypeEnum.EMAIL_BATCH:
                    metadata = await this.emailBatchService.processPendingEmails();
                    break;
                case JobTypeEnum.DEADLINE_SWEEP:
                    metadata = await this.deliverableAutomationService.runDeadlineSweep();
                    break;
                case JobTypeEnum.REVOCATION_SWEEP:
                    metadata = await this.deliverableAutomationService.runRevocationSweep();
                    break;
            }

            await this.schedulingService.completeJobExecution(execution, metadata);

            return response.ok({
                message: 'Job triggered successfully',
                executionId: execution.id,
            });
        } catch (error) {
            await this.schedulingService.failJobExecution(execution, error instanceof Error ? error : String(error));

            return response.badRequest({
                error: 'Job execution failed',
                message: error instanceof Error ? error.message : String(error),
                executionId: execution.id,
            });
        }
    }

    /**
     * PUT /admin/scheduling/jobs/:jobType/schedule
     * Update job schedule configuration
     */
    public async updateSchedule({ request, response }: HttpContext): Promise<void> {
        const jobType = request.param('jobType') as JobTypeEnum;

        if (!Object.values(JobTypeEnum).includes(jobType)) {
            return response.badRequest({
                error: 'Invalid job type',
            });
        }

        const { enabled, intervalHours, intervalMinutes } = request.only(['enabled', 'intervalHours', 'intervalMinutes']);

        if (typeof enabled !== 'boolean') {
            return response.badRequest({
                error: 'enabled must be a boolean',
            });
        }

        if (intervalHours !== undefined && (typeof intervalHours !== 'number' || intervalHours < 0)) {
            return response.badRequest({
                error: 'intervalHours must be a non-negative number',
            });
        }

        if (intervalMinutes !== undefined && (typeof intervalMinutes !== 'number' || intervalMinutes < 0)) {
            return response.badRequest({
                error: 'intervalMinutes must be a non-negative number',
            });
        }

        await this.schedulingService.updateJobSchedule(jobType, {
            enabled,
            intervalHours,
            intervalMinutes,
        });

        return response.ok({
            message: 'Schedule updated successfully',
            jobType,
            schedule: {
                enabled,
                intervalHours,
                intervalMinutes,
            },
        });
    }
}
