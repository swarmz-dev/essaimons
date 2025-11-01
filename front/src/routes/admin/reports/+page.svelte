<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { onMount, onDestroy } from 'svelte';
    import { wrappedFetch } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';
    import { Button } from '#lib/components/ui/button';
    import { Badge } from '#lib/components/ui/badge';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { ContentReportStatusEnum, ContentTypeEnum } from 'backend/types';
    import type { ContentReportReasonEnum } from 'backend/types';
    import { formatDistanceToNow } from 'date-fns';
    import { enUS, fr } from 'date-fns/locale';
    import { getLocale } from '#lib/paraglide/runtime';
    import { AlertCircle, CheckCircle, XCircle, Eye } from '@lucide/svelte';

    interface Reporter {
        id: string;
        username: string | null;
        email: string;
    }

    interface ContentReport {
        id: string;
        contentType: ContentTypeEnum;
        contentId: string;
        reason: ContentReportReasonEnum;
        description: string | null;
        status: ContentReportStatusEnum;
        reporter: Reporter;
        createdAt: string;
        updatedAt: string;
    }

    interface PaginatedReports {
        reports: ContentReport[];
        total: number;
        page: number;
        perPage: number;
        lastPage: number;
    }

    let reports: PaginatedReports | null = $state(null);
    let currentPage = $state(1);
    let statusFilter: ContentReportStatusEnum | '' = $state('');
    let contentTypeFilter: ContentTypeEnum | '' = $state('');
    let isLoading = $state(true);
    let loadingPromise: Promise<void> | null = null;
    let abortController: AbortController | null = null;

    onMount(async () => {
        await loadReports();
    });

    onDestroy(() => {
        // Abort any pending request when component unmounts
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        loadingPromise = null;
    });

    async function loadReports() {
        // Prevent concurrent loads
        if (loadingPromise) {
            return loadingPromise;
        }

        // Abort any previous request
        if (abortController) {
            abortController.abort();
        }

        // Create new abort controller for this request
        abortController = new AbortController();
        const signal = abortController.signal;

        isLoading = true;

        loadingPromise = (async () => {
            try {
                const params = new URLSearchParams();
                params.set('page', currentPage.toString());
                if (statusFilter) params.set('status', statusFilter);
                if (contentTypeFilter) params.set('contentType', contentTypeFilter);

                const url = `/admin/reports?${params.toString()}`;

                // Add timeout to prevent indefinite hangs
                const timeoutId = setTimeout(() => {
                    if (abortController) {
                        abortController.abort();
                    }
                }, 10000);

                const result = await wrappedFetch(url, { method: 'GET', signal });
                clearTimeout(timeoutId);

                if (result.isSuccess) {
                    reports = {
                        reports: result.data || [],
                        total: result.meta?.total || 0,
                        page: result.meta?.currentPage || 1,
                        perPage: result.meta?.perPage || 20,
                        lastPage: result.meta?.lastPage || 1,
                    };
                } else {
                    console.error('Failed to load reports:', result);
                    showToast('Failed to load reports', 'error');
                }
            } catch (error: any) {
                // Don't show error if request was aborted
                if (error.name !== 'AbortError') {
                    console.error('Error loading reports:', error);
                    showToast('Error loading reports', 'error');
                }
            } finally {
                isLoading = false;
                loadingPromise = null;
                abortController = null;
            }
        })();

        return loadingPromise;
    }

    function getStatusColor(status: ContentReportStatusEnum): 'default' | 'success' | 'destructive' {
        switch (status) {
            case ContentReportStatusEnum.PENDING:
                return 'default';
            case ContentReportStatusEnum.REVIEWED:
                return 'success';
            case ContentReportStatusEnum.DISMISSED:
                return 'destructive';
            default:
                return 'default';
        }
    }

    function getStatusIcon(status: ContentReportStatusEnum) {
        switch (status) {
            case ContentReportStatusEnum.PENDING:
                return AlertCircle;
            case ContentReportStatusEnum.REVIEWED:
                return CheckCircle;
            case ContentReportStatusEnum.DISMISSED:
                return XCircle;
        }
    }

    function formatRelativeTime(dateString: string): string {
        const locale = getLocale() === 'fr' ? fr : enUS;
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale });
    }

    async function handleFilterChange() {
        currentPage = 1;
        await loadReports();
    }

    async function handlePageChange(page: number) {
        currentPage = page;
        await loadReports();
    }
</script>

<Title title={m['admin.reports.title']()} hasBackground />

<Breadcrumb items={[{ title: 'Admin', href: '/admin' }, { title: m['admin.reports.title']() }]} />

<div class="mt-6 space-y-4">
    <!-- Filters -->
    <Card>
        <CardHeader>
            <CardTitle>{m['admin.reports.filters.title']()}</CardTitle>
            <CardDescription>{m['admin.reports.filters.description']()}</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="flex gap-4">
                <div class="flex-1">
                    <label for="status-filter" class="block text-sm font-medium mb-2">
                        {m['admin.reports.filters.status']()}
                    </label>
                    <select
                        id="status-filter"
                        bind:value={statusFilter}
                        onchange={handleFilterChange}
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="">{m['admin.reports.filters.all-statuses']()}</option>
                        <option value={ContentReportStatusEnum.PENDING}>{m['admin.reports.status.pending']()}</option>
                        <option value={ContentReportStatusEnum.REVIEWED}>{m['admin.reports.status.reviewed']()}</option>
                        <option value={ContentReportStatusEnum.DISMISSED}>{m['admin.reports.status.dismissed']()}</option>
                    </select>
                </div>

                <div class="flex-1">
                    <label for="type-filter" class="block text-sm font-medium mb-2">
                        {m['admin.reports.filters.content-type']()}
                    </label>
                    <select
                        id="type-filter"
                        bind:value={contentTypeFilter}
                        onchange={handleFilterChange}
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="">{m['admin.reports.filters.all-types']()}</option>
                        <option value={ContentTypeEnum.COMMENT}>{m['admin.reports.content-type.comment']()}</option>
                        <option value={ContentTypeEnum.PROPOSITION}>{m['admin.reports.content-type.proposition']()}</option>
                    </select>
                </div>
            </div>
        </CardContent>
    </Card>

    <!-- Reports List -->
    {#if isLoading}
        <Card>
            <CardContent class="py-8 text-center text-muted-foreground">Loading reports...</CardContent>
        </Card>
    {:else if reports && reports.reports}
        <!-- Debug: {JSON.stringify({ hasReports: !!reports, hasReportsArray: !!reports.reports, length: reports.reports?.length })} -->
        <div class="space-y-3">
            {#if reports.reports.length === 0}
                <Card>
                    <CardContent class="py-8 text-center text-muted-foreground">
                        {m['admin.reports.no-reports']()}
                    </CardContent>
                </Card>
            {:else}
                {#each reports.reports as report}
                    <Card>
                        <CardContent class="py-4">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex-1 space-y-2">
                                    <div class="flex items-center gap-2">
                                        <Badge variant={getStatusColor(report.status)}>
                                            {@const Icon = getStatusIcon(report.status)}
                                            <Icon class="mr-1 size-3" />
                                            {m[`admin.reports.status.${report.status}`]()}
                                        </Badge>
                                        <Badge variant="outline">
                                            {m[`admin.reports.content-type.${report.contentType}`]()}
                                        </Badge>
                                        <Badge variant="outline">
                                            {m[`report.reason-${report.reason}`]()}
                                        </Badge>
                                    </div>

                                    <div class="text-sm">
                                        <span class="text-muted-foreground">{m['admin.reports.reported-by']()}</span>
                                        <span class="font-medium">
                                            {report.reporter.username ?? report.reporter.email}
                                        </span>
                                        <span class="text-muted-foreground">
                                            • {formatRelativeTime(report.createdAt)}
                                        </span>
                                    </div>

                                    {#if report.description}
                                        <p class="text-sm text-muted-foreground">
                                            {report.description}
                                        </p>
                                    {/if}
                                </div>

                                <div>
                                    <a href={`/admin/reports/${report.id}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye class="mr-2 size-4" />
                                            {m['admin.reports.view']()}
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                {/each}
            {/if}
        </div>

        <!-- Pagination -->
        {#if reports.lastPage > 1}
            <div class="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onclick={() => handlePageChange(currentPage - 1)}>
                    {m['common.previous']()}
                </Button>

                <span class="text-sm text-muted-foreground">
                    {m['common.page']({ current: currentPage, total: reports.lastPage })}
                </span>

                <Button variant="outline" size="sm" disabled={currentPage === reports.lastPage} onclick={() => handlePageChange(currentPage + 1)}>
                    {m['common.next']()}
                </Button>
            </div>
        {/if}
    {/if}
</div>
