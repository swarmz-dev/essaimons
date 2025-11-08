<script lang="ts">
    import { onMount } from 'svelte';
    import { Title } from '#lib/components/ui/title';
    import { Button } from '#lib/components/ui/button';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#lib/components/ui/dialog';
    import { showToast } from '#lib/services/toastService';
    import { Loader2, Play, Pause, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye } from '@lucide/svelte';
    import { PUBLIC_API_REAL_URI } from '$env/static/public';
    import { m } from '#lib/paraglide/messages';

    type JobStatus = 'success' | 'failure' | 'running';

    interface JobExecution {
        id: string;
        jobType: string;
        status: JobStatus;
        startedAt: string;
        completedAt: string | null;
        durationMs: number | null;
        errorMessage: string | null;
        metadata: Record<string, any> | null;
    }

    interface JobSchedule {
        enabled: boolean;
        intervalHours?: number;
        intervalMinutes?: number;
    }

    interface JobStats {
        totalExecutions: number;
        successCount: number;
        failureCount: number;
        averageDuration: number;
        lastExecution: JobExecution | null;
        isRunning: boolean;
        nextRunAt: string | null;
        schedule: JobSchedule;
    }

    interface SchedulingStatus {
        isPaused: boolean;
        jobs: Record<string, JobStats>;
    }

    interface JobDetails extends JobStats {
        jobType: string;
        recentExecutions: JobExecution[];
        nextRunAt: string | null;
    }

    let status = $state<SchedulingStatus | null>(null);
    let selectedJob = $state<string | null>(null);
    let jobDetails = $state<JobDetails | null>(null);
    let loading = $state(true);
    let loadingJobDetails = $state(false);
    let error = $state<string | null>(null);
    let toggling = $state(false);
    let triggering = $state<string | null>(null);
    let editingSchedule = $state(false);
    let scheduleForm = $state<JobSchedule>({ enabled: true, intervalHours: 24, intervalMinutes: 0 });
    let updatingSchedule = $state(false);
    let executionDetailsModal = $state(false);
    let selectedExecution = $state<JobExecution | null>(null);
    let previewModal = $state(false);
    let loadingPreview = $state(false);
    let previewData = $state<any>(null);

    function getJobLabel(jobType: string): string {
        switch (jobType) {
            case 'email_batch':
                return m['admin.scheduling.jobs.email-batch.title']();
            case 'deadline_sweep':
                return m['admin.scheduling.jobs.deadline-sweep.title']();
            case 'revocation_sweep':
                return m['admin.scheduling.jobs.revocation-sweep.title']();
            default:
                return jobType;
        }
    }

    function getJobDescription(jobType: string): string {
        switch (jobType) {
            case 'email_batch':
                return m['admin.scheduling.jobs.email-batch.description']();
            case 'deadline_sweep':
                return m['admin.scheduling.jobs.deadline-sweep.description']();
            case 'revocation_sweep':
                return m['admin.scheduling.jobs.revocation-sweep.description']();
            default:
                return '';
        }
    }

    async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const headers = new Headers(options?.headers);
        headers.set('Content-Type', 'application/json');

        if (typeof window !== 'undefined') {
            const token = getCookie('client_token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        const response = await fetch(`${PUBLIC_API_REAL_URI}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    function getCookie(name: string): string | null {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    async function loadStatus() {
        try {
            loading = true;
            error = null;
            status = await fetchAPI<SchedulingStatus>('/api/admin/scheduling');
        } catch (err) {
            error = err instanceof Error ? err.message : m['admin.scheduling.messages.error-load']();
            showToast(m['admin.scheduling.messages.error-load'](), 'error');
        } finally {
            loading = false;
        }
    }

    async function togglePause() {
        if (!status || toggling) return;

        toggling = true;
        try {
            const newPausedState = !status.isPaused;
            await fetchAPI('/api/admin/scheduling/pause', {
                method: 'PUT',
                body: JSON.stringify({ paused: newPausedState }),
            });

            status.isPaused = newPausedState;
            showToast(newPausedState ? m['admin.scheduling.messages.paused']() : m['admin.scheduling.messages.resumed'](), 'success');
        } catch (err) {
            showToast(m['admin.scheduling.messages.error-toggle'](), 'error');
        } finally {
            toggling = false;
        }
    }

    async function selectJob(jobType: string) {
        selectedJob = jobType;
        loadingJobDetails = true;

        try {
            jobDetails = await fetchAPI<JobDetails>(`/api/admin/scheduling/jobs/${jobType}`);
        } catch (err) {
            showToast(m['admin.scheduling.messages.error-details'](), 'error');
        } finally {
            loadingJobDetails = false;
        }
    }

    async function triggerJob(jobType: string) {
        triggering = jobType;

        try {
            await fetchAPI(`/api/admin/scheduling/jobs/${jobType}/trigger`, {
                method: 'POST',
            });

            showToast(m['admin.scheduling.messages.triggered']({ job: getJobLabel(jobType) }), 'success');

            // Reload status and job details
            await loadStatus();
            if (selectedJob === jobType) {
                await selectJob(jobType);
            }
        } catch (err) {
            showToast(m['admin.scheduling.messages.error-trigger']({ job: getJobLabel(jobType) }), 'error');
        } finally {
            triggering = null;
        }
    }

    function startEditingSchedule() {
        if (!jobDetails) return;
        scheduleForm = { ...jobDetails.schedule };
        editingSchedule = true;
    }

    function cancelEditingSchedule() {
        editingSchedule = false;
    }

    async function saveSchedule() {
        if (!selectedJob) return;

        updatingSchedule = true;
        try {
            await fetchAPI(`/api/admin/scheduling/jobs/${selectedJob}/schedule`, {
                method: 'PUT',
                body: JSON.stringify(scheduleForm),
            });

            showToast(m['admin.scheduling.messages.schedule-updated'](), 'success');
            editingSchedule = false;

            // Reload status and job details
            await loadStatus();
            await selectJob(selectedJob);
        } catch (err) {
            showToast(m['admin.scheduling.messages.error-update-schedule'](), 'error');
        } finally {
            updatingSchedule = false;
        }
    }

    function formatDuration(ms: number | null): string {
        if (ms === null) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        return date.toLocaleString();
    }

    function formatRelativeTime(dateStr: string | null): string {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMs < 0) {
            return 'Overdue';
        } else if (diffMins < 1) {
            return 'Very soon';
        } else if (diffMins < 60) {
            return `in ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
        } else if (diffHours < 24) {
            return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
        } else {
            return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        }
    }

    function getStatusColor(status: JobStatus): string {
        switch (status) {
            case 'success':
                return 'text-green-600';
            case 'failure':
                return 'text-red-600';
            case 'running':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    }

    function getStatusIcon(status: JobStatus) {
        switch (status) {
            case 'success':
                return CheckCircle;
            case 'failure':
                return XCircle;
            case 'running':
                return Loader2;
            default:
                return AlertCircle;
        }
    }

    function openExecutionDetails(execution: JobExecution) {
        selectedExecution = execution;
        executionDetailsModal = true;
    }

    async function openPreview(jobType: string) {
        if (!jobType) return;

        loadingPreview = true;
        previewModal = true;
        previewData = null;

        try {
            const response = await fetchAPI<{ jobType: string; preview: any }>(`/api/admin/scheduling/jobs/${jobType}/preview`);
            previewData = response.preview;
        } catch (err) {
            showToast(m['admin.scheduling.messages.error-preview'](), 'error');
            previewModal = false;
        } finally {
            loadingPreview = false;
        }
    }

    function formatMetadata(jobType: string, metadata: Record<string, any> | null): string {
        if (!metadata) return '';

        if (metadata.manual) {
            return '';
        }

        switch (jobType) {
            case 'email_batch':
                if (metadata.emailsSent !== undefined) {
                    const parts = [];
                    if (metadata.emailsSent > 0) {
                        parts.push(`${metadata.emailsSent} email${metadata.emailsSent !== 1 ? 's' : ''}`);
                    }
                    if (metadata.usersNotified > 0) {
                        parts.push(`${metadata.usersNotified} user${metadata.usersNotified !== 1 ? 's' : ''}`);
                    }
                    if (metadata.failures > 0) {
                        parts.push(`${metadata.failures} failure${metadata.failures !== 1 ? 's' : ''}`);
                    }
                    return parts.join(', ') || 'No emails sent';
                }
                break;
            case 'deadline_sweep':
                if (metadata.deadlinesChecked !== undefined) {
                    const parts = [];
                    parts.push(`${metadata.deadlinesChecked} checked`);
                    if (metadata.deadlinesShifted > 0) {
                        parts.push(`${metadata.deadlinesShifted} shifted`);
                    }
                    if (metadata.failures > 0) {
                        parts.push(`${metadata.failures} failure${metadata.failures !== 1 ? 's' : ''}`);
                    }
                    return parts.join(', ');
                }
                break;
            case 'revocation_sweep':
                if (metadata.deliverablesChecked !== undefined) {
                    const parts = [];
                    parts.push(`${metadata.deliverablesChecked} checked`);
                    if (metadata.revocationsEscalated > 0) {
                        parts.push(`${metadata.revocationsEscalated} escalated`);
                    }
                    if (metadata.failures > 0) {
                        parts.push(`${metadata.failures} failure${metadata.failures !== 1 ? 's' : ''}`);
                    }
                    return parts.join(', ');
                }
                break;
        }

        return '';
    }

    onMount(() => {
        loadStatus();
    });
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <Title title={m['admin.scheduling.title']()} />
        <Button onclick={loadStatus} variant="outline" size="sm" disabled={loading}>
            <RefreshCw class="size-4 {loading ? 'animate-spin' : ''}" />
            {m['admin.scheduling.actions.refresh']()}
        </Button>
    </div>

    {#if loading && !status}
        <div class="flex items-center justify-center py-12">
            <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
    {:else if error && !status}
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p class="text-sm text-destructive">{error}</p>
        </div>
    {:else if status}
        <!-- Global Status Card -->
        <div class="rounded-lg border border-border bg-card p-6">
            <div class="flex items-center justify-between">
                <div class="space-y-1">
                    <h2 class="text-lg font-semibold text-foreground">{m['admin.scheduling.global.title']()}</h2>
                    <p class="text-sm text-muted-foreground">
                        {#if status.isPaused}
                            <span class="text-orange-600 font-medium">{m['admin.scheduling.status.paused']()}</span>
                            - {m['admin.scheduling.global.paused-desc']()}
                        {:else}
                            <span class="text-green-600 font-medium">{m['admin.scheduling.status.active']()}</span>
                            - {m['admin.scheduling.global.active-desc']()}
                        {/if}
                    </p>
                </div>
                <Button onclick={togglePause} variant={status.isPaused ? 'default' : 'outline'} disabled={toggling}>
                    {#if toggling}
                        <Loader2 class="mr-2 size-4 animate-spin" />
                    {:else if status.isPaused}
                        <Play class="mr-2 size-4" />
                    {:else}
                        <Pause class="mr-2 size-4" />
                    {/if}
                    {status.isPaused ? m['admin.scheduling.global.resume-button']() : m['admin.scheduling.global.pause-button']()}
                </Button>
            </div>
        </div>

        <!-- Jobs Overview -->
        <div class="grid gap-4 md:grid-cols-3">
            {#each Object.entries(status.jobs) as [jobType, stats]}
                {@const isSelected = selectedJob === jobType}
                <button
                    type="button"
                    onclick={() => selectJob(jobType)}
                    class="rounded-lg border-2 bg-card p-6 text-left transition-all hover:border-primary {isSelected ? 'border-primary shadow-lg' : 'border-border'} {!stats.schedule.enabled
                        ? 'opacity-60'
                        : ''}"
                >
                    <div class="flex items-start justify-between">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <h3 class="font-semibold text-foreground">{getJobLabel(jobType)}</h3>
                                {#if !stats.schedule.enabled}
                                    <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                        {m['admin.scheduling.schedule-config.disabled']()}
                                    </span>
                                {/if}
                            </div>
                            <p class="text-xs text-muted-foreground">{getJobDescription(jobType)}</p>
                        </div>
                        <Clock class="size-5 text-muted-foreground flex-shrink-0" />
                    </div>

                    <div class="mt-4 space-y-2">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.stats.status']()}:</span>
                            {#if stats.isRunning}
                                <span class="text-blue-600 flex items-center gap-1">
                                    <Loader2 class="size-3 animate-spin" />
                                    {m['admin.scheduling.status.running']()}
                                </span>
                            {:else if stats.lastExecution}
                                {@const StatusIcon = getStatusIcon(stats.lastExecution.status)}
                                <span class="flex items-center gap-1 {getStatusColor(stats.lastExecution.status)}">
                                    <StatusIcon class="size-3" />
                                    {m[`admin.scheduling.status.${stats.lastExecution.status}`]()}
                                </span>
                            {:else}
                                <span class="text-gray-500">{m['admin.scheduling.status.never-run']()}</span>
                            {/if}
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.stats.total-runs']()}:</span>
                            <span class="font-medium">{stats.totalExecutions}</span>
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.stats.success-rate']()}:</span>
                            <span class="font-medium">
                                {stats.totalExecutions > 0 ? Math.round((stats.successCount / stats.totalExecutions) * 100) : 0}%
                            </span>
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.stats.avg-duration']()}:</span>
                            <span class="font-medium">{formatDuration(stats.averageDuration)}</span>
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.stats.next-run']()}:</span>
                            <span class="font-medium text-primary" title={formatDate(stats.nextRunAt)}>
                                {!stats.schedule.enabled
                                    ? m['admin.scheduling.schedule-config.disabled']()
                                    : status.isPaused
                                      ? m['admin.scheduling.status.paused']()
                                      : formatRelativeTime(stats.nextRunAt)}
                            </span>
                        </div>
                    </div>
                </button>
            {/each}
        </div>

        <!-- Job Details Tab -->
        {#if selectedJob && jobDetails}
            <div class="rounded-lg border border-border bg-card">
                <div class="border-b border-border p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-semibold text-foreground">{getJobLabel(selectedJob)}</h2>
                            <p class="text-sm text-muted-foreground mt-1">{getJobDescription(selectedJob)}</p>
                        </div>
                        <div class="flex gap-2">
                            <Button onclick={() => openPreview(selectedJob!)} variant="outline" size="sm">
                                <Eye class="mr-2 size-4" />
                                {m['admin.scheduling.details.preview-button']()}
                            </Button>
                            <Button onclick={() => triggerJob(selectedJob!)} variant="outline" disabled={triggering === selectedJob || jobDetails.isRunning || status.isPaused}>
                                {#if triggering === selectedJob}
                                    <Loader2 class="mr-2 size-4 animate-spin" />
                                    {m['admin.scheduling.details.triggering']()}
                                {:else}
                                    <Play class="mr-2 size-4" />
                                    {m['admin.scheduling.details.trigger-button']()}
                                {/if}
                            </Button>
                        </div>
                    </div>
                </div>

                <div class="p-6 space-y-6">
                    <!-- Statistics -->
                    <div>
                        <h3 class="text-lg font-semibold text-foreground mb-4">{m['admin.scheduling.details.statistics']()}</h3>
                        <div class="grid gap-4 md:grid-cols-4">
                            <div class="rounded-lg border border-border bg-muted/30 p-4">
                                <div class="text-sm text-muted-foreground">{m['admin.scheduling.stats.total-executions']()}</div>
                                <div class="text-2xl font-bold">{jobDetails.totalExecutions}</div>
                            </div>
                            <div class="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4">
                                <div class="text-sm text-green-700 dark:text-green-400">{m['admin.scheduling.stats.successful']()}</div>
                                <div class="text-2xl font-bold text-green-700 dark:text-green-400">{jobDetails.successCount}</div>
                            </div>
                            <div class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
                                <div class="text-sm text-red-700 dark:text-red-400">{m['admin.scheduling.stats.failed']()}</div>
                                <div class="text-2xl font-bold text-red-700 dark:text-red-400">{jobDetails.failureCount}</div>
                            </div>
                            <div class="rounded-lg border border-border bg-muted/30 p-4">
                                <div class="text-sm text-muted-foreground">{m['admin.scheduling.stats.avg-duration']()}</div>
                                <div class="text-2xl font-bold">{formatDuration(jobDetails.averageDuration)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Schedule Configuration -->
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-semibold text-foreground">{m['admin.scheduling.schedule-config.title']()}</h3>
                            {#if !editingSchedule}
                                <Button onclick={startEditingSchedule} variant="outline" size="sm">
                                    {m['common.edit']()}
                                </Button>
                            {/if}
                        </div>

                        {#if editingSchedule}
                            <div class="rounded-lg border border-border bg-card p-4 space-y-4">
                                <div class="flex items-center justify-between">
                                    <label class="text-sm font-medium text-foreground">{m['admin.scheduling.schedule-config.enabled']()}</label>
                                    <input type="checkbox" bind:checked={scheduleForm.enabled} class="h-4 w-4 rounded border-gray-300" />
                                </div>

                                <div class="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label class="text-sm font-medium text-foreground block mb-2">{m['admin.scheduling.schedule-config.hours']()}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            bind:value={scheduleForm.intervalHours}
                                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label class="text-sm font-medium text-foreground block mb-2">{m['admin.scheduling.schedule-config.minutes']()}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            bind:value={scheduleForm.intervalMinutes}
                                            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div class="flex justify-end gap-2 pt-2">
                                    <Button onclick={cancelEditingSchedule} variant="outline" size="sm" disabled={updatingSchedule}>
                                        {m['admin.scheduling.schedule-config.cancel']()}
                                    </Button>
                                    <Button onclick={saveSchedule} size="sm" disabled={updatingSchedule}>
                                        {#if updatingSchedule}
                                            <Loader2 class="mr-2 size-4 animate-spin" />
                                        {/if}
                                        {m['admin.scheduling.schedule-config.save']()}
                                    </Button>
                                </div>
                            </div>
                        {:else}
                            <div class="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-muted-foreground">{m['admin.scheduling.stats.status']()}:</span>
                                    <span class="font-medium {jobDetails.schedule.enabled ? 'text-green-600' : 'text-gray-500'}">
                                        {jobDetails.schedule.enabled ? m['admin.scheduling.schedule-config.enabled']() : m['admin.scheduling.schedule-config.disabled']()}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-muted-foreground">{m['admin.scheduling.schedule-config.interval']()}:</span>
                                    <span class="font-medium">
                                        {#if jobDetails.schedule.intervalHours && jobDetails.schedule.intervalMinutes}
                                            {jobDetails.schedule.intervalHours}h {jobDetails.schedule.intervalMinutes}m
                                        {:else if jobDetails.schedule.intervalHours}
                                            {jobDetails.schedule.intervalHours}h
                                        {:else if jobDetails.schedule.intervalMinutes}
                                            {jobDetails.schedule.intervalMinutes}m
                                        {:else}
                                            N/A
                                        {/if}
                                    </span>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <!-- Execution History -->
                    <div>
                        <h3 class="text-lg font-semibold text-foreground mb-4">{m['admin.scheduling.details.recent-executions']()}</h3>
                        {#if loadingJobDetails}
                            <div class="flex items-center justify-center py-8">
                                <Loader2 class="size-6 animate-spin text-muted-foreground" />
                            </div>
                        {:else if jobDetails.recentExecutions.length === 0}
                            <div class="text-center py-8 text-muted-foreground">{m['admin.scheduling.details.no-executions']()}</div>
                        {:else}
                            <div class="overflow-hidden rounded-lg border border-border">
                                <table class="w-full">
                                    <thead class="bg-muted/50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.status']()}</th>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.started']()}</th>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.completed']()}</th>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.duration']()}</th>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.details']()}</th>
                                            <th class="px-4 py-3 text-left text-sm font-semibold text-foreground">{m['admin.scheduling.table.actions']()}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each jobDetails.recentExecutions as execution}
                                            {@const StatusIcon = getStatusIcon(execution.status)}
                                            <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                                                <td class="px-4 py-3">
                                                    <div class="flex items-center gap-2 {getStatusColor(execution.status)}">
                                                        <StatusIcon class="size-4 {execution.status === 'running' ? 'animate-spin' : ''}" />
                                                        <span class="capitalize">{m[`admin.scheduling.status.${execution.status}`]()}</span>
                                                    </div>
                                                </td>
                                                <td class="px-4 py-3 text-sm">{formatDate(execution.startedAt)}</td>
                                                <td class="px-4 py-3 text-sm">{formatDate(execution.completedAt)}</td>
                                                <td class="px-4 py-3 text-sm font-medium">{formatDuration(execution.durationMs)}</td>
                                                <td class="px-4 py-3 text-sm">
                                                    {#if execution.errorMessage}
                                                        <div class="max-w-md truncate text-red-600" title={execution.errorMessage}>{execution.errorMessage}</div>
                                                    {:else}
                                                        {@const metadataStr = formatMetadata(selectedJob, execution.metadata)}
                                                        <div class="flex items-center gap-2 flex-wrap">
                                                            {#if execution.metadata?.manual}
                                                                <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                                                    {m['admin.scheduling.table.manual-trigger']()}
                                                                </span>
                                                            {/if}
                                                            {#if metadataStr}
                                                                <span class="text-xs text-muted-foreground">{metadataStr}</span>
                                                            {:else if !execution.metadata?.manual}
                                                                <span class="text-muted-foreground">{m['admin.scheduling.table.scheduled']()}</span>
                                                            {/if}
                                                        </div>
                                                    {/if}
                                                </td>
                                                <td class="px-4 py-3">
                                                    <button
                                                        onclick={() => openExecutionDetails(execution)}
                                                        class="p-1 hover:bg-muted rounded-md transition-colors"
                                                        title={m['admin.scheduling.details.view-details']()}
                                                    >
                                                        <Eye class="size-4 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<!-- Execution Details Modal -->
<Dialog open={executionDetailsModal} onOpenChange={(open) => (executionDetailsModal = open)}>
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{m['admin.scheduling.details.execution-details']()}</DialogTitle>
            <DialogDescription>
                {#if selectedExecution}
                    {m['admin.scheduling.details.execution-id']()}: {selectedExecution.id}
                {/if}
            </DialogDescription>
        </DialogHeader>

        {#if selectedExecution}
            {@const StatusIcon = getStatusIcon(selectedExecution.status)}
            <div class="space-y-4 pt-4">
                <!-- Status Section -->
                <div class="rounded-lg border border-border bg-muted/30 p-4">
                    <h4 class="text-sm font-semibold text-foreground mb-3">{m['admin.scheduling.details.status-info']()}</h4>
                    <div class="grid gap-3">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.table.status']()}:</span>
                            <div class="flex items-center gap-2 {getStatusColor(selectedExecution.status)}">
                                <StatusIcon class="size-4 {selectedExecution.status === 'running' ? 'animate-spin' : ''}" />
                                <span class="capitalize font-medium">{m[`admin.scheduling.status.${selectedExecution.status}`]()}</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.table.started']()}:</span>
                            <span class="font-medium">{formatDate(selectedExecution.startedAt)}</span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.table.completed']()}:</span>
                            <span class="font-medium">{formatDate(selectedExecution.completedAt)}</span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">{m['admin.scheduling.table.duration']()}:</span>
                            <span class="font-medium">{formatDuration(selectedExecution.durationMs)}</span>
                        </div>
                    </div>
                </div>

                <!-- Error Message Section -->
                {#if selectedExecution.errorMessage}
                    <div class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
                        <h4 class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">{m['admin.scheduling.details.error-message']()}</h4>
                        <p class="text-sm text-red-600 dark:text-red-300 font-mono whitespace-pre-wrap">{selectedExecution.errorMessage}</p>
                    </div>
                {/if}

                <!-- Metadata Section -->
                {#if selectedExecution.metadata}
                    <div class="rounded-lg border border-border bg-muted/30 p-4">
                        <h4 class="text-sm font-semibold text-foreground mb-3">{m['admin.scheduling.details.execution-metadata']()}</h4>

                        {#if selectedExecution.metadata.manual}
                            <div class="mb-3">
                                <span class="inline-flex items-center gap-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-md">
                                    <AlertCircle class="size-3" />
                                    {m['admin.scheduling.table.manual-trigger']()}
                                </span>
                            </div>
                        {/if}

                        {#if selectedJob === 'email_batch' && selectedExecution.metadata.emailsSent !== undefined}
                            <div class="grid gap-3">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-muted-foreground">{m['admin.scheduling.details.emails-sent']()}:</span>
                                    <span class="font-medium">{selectedExecution.metadata.emailsSent}</span>
                                </div>
                                {#if selectedExecution.metadata.usersNotified !== undefined}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.users-notified']()}:</span>
                                        <span class="font-medium">{selectedExecution.metadata.usersNotified}</span>
                                    </div>
                                {/if}
                                {#if selectedExecution.metadata.failures !== undefined && selectedExecution.metadata.failures > 0}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.failures']()}:</span>
                                        <span class="font-medium text-red-600">{selectedExecution.metadata.failures}</span>
                                    </div>
                                {/if}
                            </div>
                        {:else if selectedJob === 'deadline_sweep' && selectedExecution.metadata.deadlinesChecked !== undefined}
                            <div class="grid gap-3">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-muted-foreground">{m['admin.scheduling.details.deadlines-checked']()}:</span>
                                    <span class="font-medium">{selectedExecution.metadata.deadlinesChecked}</span>
                                </div>
                                {#if selectedExecution.metadata.deadlinesShifted !== undefined}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.deadlines-shifted']()}:</span>
                                        <span class="font-medium">{selectedExecution.metadata.deadlinesShifted}</span>
                                    </div>
                                {/if}
                                {#if selectedExecution.metadata.failures !== undefined && selectedExecution.metadata.failures > 0}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.failures']()}:</span>
                                        <span class="font-medium text-red-600">{selectedExecution.metadata.failures}</span>
                                    </div>
                                {/if}
                            </div>
                        {:else if selectedJob === 'revocation_sweep' && selectedExecution.metadata.deliverablesChecked !== undefined}
                            <div class="grid gap-3">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-muted-foreground">{m['admin.scheduling.details.deliverables-checked']()}:</span>
                                    <span class="font-medium">{selectedExecution.metadata.deliverablesChecked}</span>
                                </div>
                                {#if selectedExecution.metadata.revocationsEscalated !== undefined}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.revocations-escalated']()}:</span>
                                        <span class="font-medium">{selectedExecution.metadata.revocationsEscalated}</span>
                                    </div>
                                {/if}
                                {#if selectedExecution.metadata.failures !== undefined && selectedExecution.metadata.failures > 0}
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">{m['admin.scheduling.details.failures']()}:</span>
                                        <span class="font-medium text-red-600">{selectedExecution.metadata.failures}</span>
                                    </div>
                                {/if}
                            </div>
                        {:else}
                            <div class="text-sm text-muted-foreground">
                                {m['admin.scheduling.details.no-metadata']()}
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Raw Metadata (for debugging) -->
                {#if selectedExecution.metadata && Object.keys(selectedExecution.metadata).length > 0}
                    <details class="rounded-lg border border-border bg-muted/30 p-4">
                        <summary class="text-sm font-semibold text-foreground cursor-pointer">
                            {m['admin.scheduling.details.raw-metadata']()}
                        </summary>
                        <pre class="mt-3 text-xs font-mono bg-background p-3 rounded border border-border overflow-x-auto">{JSON.stringify(selectedExecution.metadata, null, 2)}</pre>
                    </details>
                {/if}
            </div>
        {/if}
    </DialogContent>
</Dialog>

<!-- Preview Next Run Modal -->
<Dialog open={previewModal} onOpenChange={(open) => (previewModal = open)}>
    <DialogContent class="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{m['admin.scheduling.preview.title']()}</DialogTitle>
            <DialogDescription>
                {#if selectedJob}
                    {m['admin.scheduling.preview.description']()}: {getJobLabel(selectedJob)}
                {/if}
            </DialogDescription>
        </DialogHeader>

        {#if loadingPreview}
            <div class="flex items-center justify-center py-12">
                <Loader2 class="size-8 animate-spin text-muted-foreground" />
            </div>
        {:else if previewData}
            <div class="space-y-4 pt-4">
                {#if selectedJob === 'email_batch'}
                    <!-- Email Batch Preview -->
                    <div class="rounded-lg border border-border bg-muted/30 p-4">
                        <h4 class="text-sm font-semibold text-foreground mb-3">{m['admin.scheduling.preview.summary']()}</h4>
                        <div class="grid gap-3">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-muted-foreground">{m['admin.scheduling.preview.total-emails']()}:</span>
                                <span class="font-medium">{previewData.totalEmails}</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-muted-foreground">{m['admin.scheduling.preview.users-to-notify']()}:</span>
                                <span class="font-medium">{previewData.userCount}</span>
                            </div>
                        </div>
                    </div>

                    {#if previewData.users && previewData.users.length > 0}
                        <div class="rounded-lg border border-border bg-card">
                            <div class="px-4 py-3 border-b border-border">
                                <h4 class="text-sm font-semibold text-foreground">{m['admin.scheduling.preview.users-list']()}</h4>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-muted/50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.username']()}</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.email']()}</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-foreground">{m['admin.scheduling.preview.notifications']()}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each previewData.users as user}
                                            <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                                                <td class="px-4 py-3 text-sm">{user.username}</td>
                                                <td class="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                                                <td class="px-4 py-3 text-sm text-right font-medium">{user.notificationCount}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                            {#if previewData.totalEmails > previewData.users.length}
                                <div class="px-4 py-3 border-t border-border text-sm text-muted-foreground text-center">
                                    {m['admin.scheduling.preview.showing-first']()}
                                    {previewData.users.length}
                                    {m['admin.scheduling.preview.of']()}
                                    {previewData.userCount}
                                    {m['admin.scheduling.preview.users']()}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="text-center py-8 text-muted-foreground">
                            {m['admin.scheduling.preview.no-items']()}
                        </div>
                    {/if}
                {:else if selectedJob === 'deadline_sweep'}
                    <!-- Deadline Sweep Preview -->
                    <div class="rounded-lg border border-border bg-muted/30 p-4">
                        <h4 class="text-sm font-semibold text-foreground mb-3">{m['admin.scheduling.preview.summary']()}</h4>
                        <div class="grid gap-3">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-muted-foreground">{m['admin.scheduling.preview.propositions-to-check']()}:</span>
                                <span class="font-medium">{previewData.totalPropositions}</span>
                            </div>
                        </div>
                    </div>

                    {#if previewData.propositions && previewData.propositions.length > 0}
                        <div class="rounded-lg border border-border bg-card">
                            <div class="px-4 py-3 border-b border-border">
                                <h4 class="text-sm font-semibold text-foreground">{m['admin.scheduling.preview.propositions-list']()}</h4>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-muted/50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.proposition']()}</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.status']()}</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-foreground">{m['admin.scheduling.preview.hours-until-deadline']()}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each previewData.propositions as prop}
                                            <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                                                <td class="px-4 py-3 text-sm">{prop.title}</td>
                                                <td class="px-4 py-3 text-sm">
                                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                                        {prop.status}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 text-sm text-right font-medium">{prop.hoursUntilDeadline}h</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {:else}
                        <div class="text-center py-8 text-muted-foreground">
                            {m['admin.scheduling.preview.no-items']()}
                        </div>
                    {/if}
                {:else if selectedJob === 'revocation_sweep'}
                    <!-- Revocation Sweep Preview -->
                    <div class="rounded-lg border border-border bg-muted/30 p-4">
                        <h4 class="text-sm font-semibold text-foreground mb-3">{m['admin.scheduling.preview.summary']()}</h4>
                        <div class="grid gap-3">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-muted-foreground">{m['admin.scheduling.preview.deliverables-to-check']()}:</span>
                                <span class="font-medium">{previewData.totalDeliverables}</span>
                            </div>
                        </div>
                    </div>

                    {#if previewData.deliverables && previewData.deliverables.length > 0}
                        <div class="rounded-lg border border-border bg-card">
                            <div class="px-4 py-3 border-b border-border">
                                <h4 class="text-sm font-semibold text-foreground">{m['admin.scheduling.preview.deliverables-list']()}</h4>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-muted/50">
                                        <tr>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.deliverable']()}</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.proposition']()}</th>
                                            <th class="px-4 py-3 text-left text-xs font-semibold text-foreground">{m['admin.scheduling.preview.status']()}</th>
                                            <th class="px-4 py-3 text-right text-xs font-semibold text-foreground">{m['admin.scheduling.preview.days-since-upload']()}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each previewData.deliverables as deliverable}
                                            <tr class="border-t border-border hover:bg-muted/30 transition-colors">
                                                <td class="px-4 py-3 text-sm">{deliverable.label}</td>
                                                <td class="px-4 py-3 text-sm text-muted-foreground">{deliverable.propositionTitle}</td>
                                                <td class="px-4 py-3 text-sm">
                                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                                                        {deliverable.status}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 text-sm text-right font-medium">{deliverable.daysSinceUpload} {m['admin.scheduling.preview.days']()}</td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {:else}
                        <div class="text-center py-8 text-muted-foreground">
                            {m['admin.scheduling.preview.no-items']()}
                        </div>
                    {/if}
                {/if}
            </div>
        {/if}
    </DialogContent>
</Dialog>
