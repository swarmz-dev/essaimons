import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import JobExecution from '#models/job_execution';
import { JobTypeEnum, JobStatusEnum } from '#types';
import logger from '@adonisjs/core/services/logger';
import SettingsService from '#services/settings_service';

@inject()
export default class SchedulingService {
    private isPaused: boolean = false;
    private runningJobs: Map<JobTypeEnum, string> = new Map();

    constructor(private readonly settingsService: SettingsService) {}

    /**
     * Check if scheduling is paused
     */
    async isSchedulingPaused(): Promise<boolean> {
        try {
            const settings = await this.settingsService.getOrganizationSettings();
            return settings.schedulingPaused ?? false;
        } catch (error) {
            logger.error('Failed to check scheduling pause status', { error });
            return this.isPaused;
        }
    }

    /**
     * Set scheduling pause status
     */
    async setSchedulingPaused(paused: boolean): Promise<void> {
        this.isPaused = paused;
        try {
            const settings = await this.settingsService.getOrganizationSettings();
            await this.settingsService.updateOrganizationSettings({
                fallbackLocale: settings.fallbackLocale,
                translations: {
                    name: settings.name,
                    description: settings.description,
                    sourceCodeUrl: settings.sourceCodeUrl,
                    copyright: settings.copyright,
                },
                schedulingPaused: paused,
            });
            logger.info(`Scheduling ${paused ? 'paused' : 'resumed'}`, { paused });
        } catch (error) {
            logger.error('Failed to update scheduling pause status', { error, paused });
        }
    }

    /**
     * Start tracking a job execution
     */
    async startJobExecution(jobType: JobTypeEnum, metadata?: Record<string, any>): Promise<JobExecution> {
        const execution = await JobExecution.create({
            jobType,
            status: JobStatusEnum.RUNNING,
            startedAt: DateTime.now(),
            metadata: metadata || null,
        });

        this.runningJobs.set(jobType, execution.id);
        logger.info('Job execution started', { jobType, executionId: execution.id });

        return execution;
    }

    /**
     * Mark a job execution as successful
     */
    async completeJobExecution(execution: JobExecution, metadata?: Record<string, any>): Promise<void> {
        const now = DateTime.now();
        const duration = now.diff(execution.startedAt).as('milliseconds');

        execution.status = JobStatusEnum.SUCCESS;
        execution.completedAt = now;
        execution.durationMs = Math.round(duration);

        if (metadata) {
            execution.metadata = { ...execution.metadata, ...metadata };
        }

        await execution.save();
        this.runningJobs.delete(execution.jobType);

        logger.info('Job execution completed', {
            jobType: execution.jobType,
            executionId: execution.id,
            durationMs: execution.durationMs,
        });
    }

    /**
     * Mark a job execution as failed
     */
    async failJobExecution(execution: JobExecution, error: Error | string, metadata?: Record<string, any>): Promise<void> {
        const now = DateTime.now();
        const duration = now.diff(execution.startedAt).as('milliseconds');

        execution.status = JobStatusEnum.FAILURE;
        execution.completedAt = now;
        execution.durationMs = Math.round(duration);
        execution.errorMessage = error instanceof Error ? error.message : error;

        if (metadata) {
            execution.metadata = { ...execution.metadata, ...metadata };
        }

        await execution.save();
        this.runningJobs.delete(execution.jobType);

        logger.error('Job execution failed', {
            jobType: execution.jobType,
            executionId: execution.id,
            durationMs: execution.durationMs,
            error: execution.errorMessage,
        });
    }

    /**
     * Get the current status of a job type
     */
    isJobRunning(jobType: JobTypeEnum): boolean {
        return this.runningJobs.has(jobType);
    }

    /**
     * Get job schedule configuration
     */
    async getJobSchedule(jobType: JobTypeEnum): Promise<{ enabled: boolean; intervalHours?: number; intervalMinutes?: number }> {
        const settings = await this.settingsService.getOrganizationSettings();
        const jobSchedules = settings.jobSchedules || {};

        // Default schedules if not configured
        const defaultSchedules: Record<string, { enabled: boolean; intervalHours?: number; intervalMinutes?: number }> = {
            email_batch: { enabled: true, intervalHours: 1 },
            deadline_sweep: { enabled: true, intervalHours: 6 },
            revocation_sweep: { enabled: true, intervalHours: 24 },
            deadline_reminders: { enabled: true, intervalHours: 12 },
        };

        return jobSchedules[jobType] || defaultSchedules[jobType] || { enabled: true, intervalHours: 24 };
    }

    /**
     * Calculate next run time based on last execution and interval
     */
    async getNextRunTime(jobType: JobTypeEnum): Promise<string | null> {
        const schedule = await this.getJobSchedule(jobType);

        if (!schedule.enabled) {
            return null;
        }

        const intervalHours = schedule.intervalHours || 0;
        const intervalMinutes = schedule.intervalMinutes || 0;
        const totalMinutes = intervalHours * 60 + intervalMinutes;

        if (totalMinutes === 0) {
            return null;
        }

        // Get the last completed execution
        const lastExecution = await JobExecution.query().where('job_type', jobType).whereNotNull('completed_at').orderBy('completed_at', 'desc').first();

        if (!lastExecution || !lastExecution.completedAt) {
            // If never run, estimate based on current time + interval
            return DateTime.now().plus({ minutes: totalMinutes }).toISO();
        }

        // Calculate next run based on last completion time
        // completedAt is already a Luxon DateTime object
        const nextRun = lastExecution.completedAt.plus({ minutes: totalMinutes });

        // If next run is in the past, it should run soon (return near future)
        if (nextRun < DateTime.now()) {
            return DateTime.now().plus({ minutes: 1 }).toISO();
        }

        return nextRun.toISO();
    }

    /**
     * Check if a job should run now based on its schedule
     */
    async shouldJobRun(jobType: JobTypeEnum): Promise<boolean> {
        const schedule = await this.getJobSchedule(jobType);

        // Job is disabled
        if (!schedule.enabled) {
            return false;
        }

        // Job is already running
        if (this.isJobRunning(jobType)) {
            return false;
        }

        const intervalHours = schedule.intervalHours || 0;
        const intervalMinutes = schedule.intervalMinutes || 0;
        const totalMinutes = intervalHours * 60 + intervalMinutes;

        // Invalid interval
        if (totalMinutes === 0) {
            return false;
        }

        // Get the last completed execution
        const lastExecution = await JobExecution.query().where('job_type', jobType).whereNotNull('completed_at').orderBy('completed_at', 'desc').first();

        // Never run before, should run
        if (!lastExecution || !lastExecution.completedAt) {
            return true;
        }

        // Check if enough time has passed since last execution
        // completedAt is already a Luxon DateTime object
        const nextRun = lastExecution.completedAt.plus({ minutes: totalMinutes });

        return nextRun <= DateTime.now();
    }

    /**
     * Get job execution statistics
     */
    async getJobStatistics(
        jobType: JobTypeEnum,
        limit: number = 100
    ): Promise<{
        totalExecutions: number;
        successCount: number;
        failureCount: number;
        averageDuration: number;
        lastExecution: JobExecution | null;
        recentExecutions: JobExecution[];
        nextRunAt: string | null;
        schedule: { enabled: boolean; intervalHours?: number; intervalMinutes?: number };
    }> {
        const executions = await JobExecution.query().where('job_type', jobType).orderBy('started_at', 'desc').limit(limit);

        const totalExecutions = executions.length;
        const successCount = executions.filter((e) => e.status === JobStatusEnum.SUCCESS).length;
        const failureCount = executions.filter((e) => e.status === JobStatusEnum.FAILURE).length;

        const completedExecutions = executions.filter((e) => e.durationMs !== null);
        const averageDuration = completedExecutions.length > 0 ? completedExecutions.reduce((sum, e) => sum + (e.durationMs || 0), 0) / completedExecutions.length : 0;

        const nextRunAt = await this.getNextRunTime(jobType);
        const schedule = await this.getJobSchedule(jobType);

        return {
            totalExecutions,
            successCount,
            failureCount,
            averageDuration: Math.round(averageDuration),
            lastExecution: executions[0] || null,
            recentExecutions: executions.slice(0, 10),
            nextRunAt,
            schedule,
        };
    }

    /**
     * Get all job statistics
     */
    async getAllJobStatistics(): Promise<
        Record<
            JobTypeEnum,
            {
                totalExecutions: number;
                successCount: number;
                failureCount: number;
                averageDuration: number;
                lastExecution: JobExecution | null;
                isRunning: boolean;
                nextRunAt: string | null;
                schedule: { enabled: boolean; intervalHours?: number; intervalMinutes?: number };
            }
        >
    > {
        const jobTypes = Object.values(JobTypeEnum);
        const stats: any = {};

        for (const jobType of jobTypes) {
            const jobStats = await this.getJobStatistics(jobType, 100);
            const schedule = await this.getJobSchedule(jobType);
            stats[jobType] = {
                ...jobStats,
                recentExecutions: undefined, // Don't include in summary
                isRunning: this.isJobRunning(jobType),
                schedule,
            };
        }

        return stats;
    }

    /**
     * Update job schedule configuration
     */
    async updateJobSchedule(jobType: JobTypeEnum, schedule: { enabled: boolean; intervalHours?: number; intervalMinutes?: number }): Promise<void> {
        const settings = await this.settingsService.getOrganizationSettings();
        const jobSchedules = settings.jobSchedules || {};

        jobSchedules[jobType] = schedule;

        await this.settingsService.updateOrganizationSettings({
            fallbackLocale: settings.fallbackLocale,
            translations: {
                name: settings.name,
                description: settings.description,
                sourceCodeUrl: settings.sourceCodeUrl,
                copyright: settings.copyright,
            },
            jobSchedules,
        });

        logger.info('Job schedule updated', { jobType, schedule });
    }

    /**
     * Clean up old job executions (older than 90 days)
     */
    async cleanupOldExecutions(): Promise<void> {
        const ninetyDaysAgo = DateTime.now().minus({ days: 90 });

        const deleted = await JobExecution.query().where('created_at', '<', ninetyDaysAgo.toSQL()).delete();

        logger.info('Cleaned up old job executions', { deletedCount: deleted });
    }
}
