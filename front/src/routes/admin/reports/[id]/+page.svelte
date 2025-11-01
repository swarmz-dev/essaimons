<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { onMount } from 'svelte';
    import { wrappedFetch } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';
    import { Button } from '#lib/components/ui/button';
    import { Badge } from '#lib/components/ui/badge';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { Textarea } from '#lib/components/ui/textarea';
    import { ContentReportStatusEnum, ContentTypeEnum, PropositionCommentScopeEnum } from 'backend/types';
    import type { ContentReportReasonEnum } from 'backend/types';
    import { formatDistanceToNow, format } from 'date-fns';
    import { enUS, fr } from 'date-fns/locale';
    import { getLocale } from '#lib/paraglide/runtime';
    import { AlertCircle, CheckCircle, XCircle, User, Clock, FileText, MessageSquare, ExternalLink, Trash2 } from '@lucide/svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';

    interface Reporter {
        id: string;
        username: string | null;
        email: string;
    }

    interface Reviewer {
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
        reviewer: Reviewer | null;
        reviewNotes: string | null;
        reviewedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }

    interface ReportedContent {
        id: string;
        content?: string;
        title?: string;
        author?: {
            username: string | null;
            email: string;
        };
        createdAt: string;
    }

    interface ReportDetails {
        report: ContentReport;
        content: ReportedContent;
    }

    let reportDetails: ReportDetails | null = $state(null);
    let reviewNotes = $state('');
    let isSubmitting = $state(false);
    let isLoading = $state(true);
    const reportId = page.params.id;

    onMount(async () => {
        await loadReportDetails();
    });

    async function loadReportDetails() {
        isLoading = true;
        const result = await wrappedFetch(`/admin/reports/${reportId}`, { method: 'GET' });

        if (result.isSuccess) {
            // The API returns report and content directly, not wrapped in data
            reportDetails = {
                report: result.report,
                content: result.content,
            };
        }
        isLoading = false;
    }

    async function handleReview(newStatus: ContentReportStatusEnum.REVIEWED | ContentReportStatusEnum.DISMISSED) {
        if (!reportDetails) return;

        isSubmitting = true;
        const result = await wrappedFetch(`/admin/reports/${reportId}/review`, {
            method: 'PUT',
            body: {
                status: newStatus,
                reviewNotes: reviewNotes.trim() || undefined,
            },
        });

        isSubmitting = false;

        if (result.isSuccess) {
            showToast(m['admin.reports.review.success'](), 'success');
            goto('/admin/reports');
        } else {
            let errorMessage = m['admin.reports.review.error']();
            if (result.error && typeof result.error === 'string') {
                errorMessage = result.error;
            }
            showToast(errorMessage, 'error');
        }
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

    function formatDateTime(dateString: string): string {
        const locale = getLocale() === 'fr' ? fr : enUS;
        return format(new Date(dateString), 'PPpp', { locale });
    }

    function getContentUrl(): string | null {
        if (!reportDetails) return null;

        if (reportDetails.report.contentType === ContentTypeEnum.COMMENT) {
            // For comments, we need the proposition ID and should open the appropriate tab based on scope
            const comment = reportDetails.content as any;
            const propositionId = comment.proposition?.id;
            const scope = comment.scope;

            if (propositionId) {
                // Map comment scope to tab name
                let tabName = 'clarifications'; // default
                switch (scope) {
                    case PropositionCommentScopeEnum.CLARIFICATION:
                        tabName = 'clarifications';
                        break;
                    case PropositionCommentScopeEnum.AMENDMENT:
                        tabName = 'amendments';
                        break;
                    case PropositionCommentScopeEnum.EVALUATION:
                        tabName = 'followup';
                        break;
                    case PropositionCommentScopeEnum.MANDATE:
                        tabName = 'mandates';
                        break;
                }

                return `/propositions/${propositionId}?tab=${tabName}#comment-${reportDetails.report.contentId}`;
            }
        } else if (reportDetails.report.contentType === ContentTypeEnum.PROPOSITION) {
            // For propositions, just go to the proposition page
            return `/propositions/${reportDetails.report.contentId}`;
        }

        return null;
    }

    async function handleDeleteContent() {
        if (!reportDetails || !confirm(m['admin.reports.detail.delete-confirm']())) {
            return;
        }

        isSubmitting = true;

        const result = await wrappedFetch(`/admin/reports/${reportId}/hide-content`, {
            method: 'POST',
            body: {
                reviewNotes: reviewNotes.trim() || undefined,
            },
        });

        isSubmitting = false;

        if (result.isSuccess) {
            showToast(m['admin.reports.detail.delete-success'](), 'success');
            goto('/admin/reports');
        } else {
            let errorMessage = m['admin.reports.detail.delete-error']();
            if (result.error && typeof result.error === 'string') {
                errorMessage = result.error;
            }
            showToast(errorMessage, 'error');
        }
    }
</script>

<Title title={m['admin.reports.detail.title']()} hasBackground />

<Breadcrumb items={[{ title: 'Admin', href: '/admin' }, { title: m['admin.reports.title'](), href: '/admin/reports' }, { title: m['admin.reports.detail.title']() }]} />

{#if isLoading}
    <Card>
        <CardContent class="py-8 text-center text-muted-foreground">Loading report details...</CardContent>
    </Card>
{:else if reportDetails}
    <div class="mt-6 space-y-6">
        <!-- Report Info -->
        <Card>
            <CardHeader>
                <div class="flex items-start justify-between">
                    <div class="space-y-2">
                        <CardTitle>{m['admin.reports.detail.report-info']()}</CardTitle>
                        <div class="flex gap-2">
                            <Badge variant={getStatusColor(reportDetails.report.status)}>
                                {@const Icon = getStatusIcon(reportDetails.report.status)}
                                <Icon class="mr-1 size-3" />
                                {m[`admin.reports.status.${reportDetails.report.status}`]()}
                            </Badge>
                            <Badge variant="outline">
                                {m[`admin.reports.content-type.${reportDetails.report.contentType}`]()}
                            </Badge>
                            <Badge variant="outline">
                                {m[`report.reason-${reportDetails.report.reason}`]()}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <User class="size-4" />
                            {m['admin.reports.detail.reporter']()}
                        </div>
                        <div class="font-medium">
                            {reportDetails.report.reporter.username ?? reportDetails.report.reporter.email}
                        </div>
                    </div>

                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock class="size-4" />
                            {m['admin.reports.detail.reported-at']()}
                        </div>
                        <div class="font-medium">{formatDateTime(reportDetails.report.createdAt)}</div>
                        <div class="text-sm text-muted-foreground">{formatRelativeTime(reportDetails.report.createdAt)}</div>
                    </div>
                </div>

                {#if reportDetails.report.description}
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-sm font-medium">
                            <MessageSquare class="size-4" />
                            {m['admin.reports.detail.reporter-notes']()}
                        </div>
                        <p class="rounded-md bg-muted p-3 text-sm">{reportDetails.report.description}</p>
                    </div>
                {/if}

                {#if reportDetails.report.reviewedAt}
                    <div class="border-t pt-4 space-y-3">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User class="size-4" />
                                    {m['admin.reports.detail.reviewer']()}
                                </div>
                                <div class="font-medium">
                                    {reportDetails.report.reviewer?.username ?? reportDetails.report.reviewer?.email ?? 'N/A'}
                                </div>
                            </div>

                            <div class="space-y-1">
                                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock class="size-4" />
                                    {m['admin.reports.detail.reviewed-at']()}
                                </div>
                                <div class="font-medium">{formatDateTime(reportDetails.report.reviewedAt)}</div>
                                <div class="text-sm text-muted-foreground">{formatRelativeTime(reportDetails.report.reviewedAt)}</div>
                            </div>
                        </div>

                        {#if reportDetails.report.reviewNotes}
                            <div class="space-y-2">
                                <div class="flex items-center gap-2 text-sm font-medium">
                                    <FileText class="size-4" />
                                    {m['admin.reports.detail.review-notes']()}
                                </div>
                                <p class="rounded-md bg-muted p-3 text-sm">{reportDetails.report.reviewNotes}</p>
                            </div>
                        {/if}
                    </div>
                {/if}
            </CardContent>
        </Card>

        <!-- Reported Content -->
        <Card>
            <CardHeader>
                <div class="flex items-start justify-between">
                    <div>
                        <CardTitle>{m['admin.reports.detail.reported-content']()}</CardTitle>
                        <CardDescription>
                            {m['admin.reports.detail.content-description']({ type: m[`admin.reports.content-type.${reportDetails.report.contentType}`]() })}
                        </CardDescription>
                    </div>
                    {#if getContentUrl()}
                        <a href={getContentUrl()} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                                <ExternalLink class="mr-2 size-4" />
                                {m['admin.reports.detail.view-in-context']()}
                            </Button>
                        </a>
                    {/if}
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                {#if reportDetails.content.author}
                    <div class="space-y-1">
                        <div class="text-sm text-muted-foreground">{m['admin.reports.detail.content-author']()}</div>
                        <div class="font-medium">
                            {reportDetails.content.author.username ?? reportDetails.content.author.email}
                        </div>
                    </div>
                {/if}

                {#if reportDetails.content.title}
                    <div class="space-y-1">
                        <div class="text-sm text-muted-foreground">{m['admin.reports.detail.content-title']()}</div>
                        <div class="font-medium">{reportDetails.content.title}</div>
                    </div>
                {/if}

                {#if reportDetails.content.content}
                    <div class="space-y-1">
                        <div class="text-sm text-muted-foreground">{m['admin.reports.detail.content-text']()}</div>
                        <div class="rounded-md border bg-muted/50 p-4 text-sm">{reportDetails.content.content}</div>
                    </div>
                {/if}

                <div class="space-y-1">
                    <div class="text-sm text-muted-foreground">{m['admin.reports.detail.content-created-at']()}</div>
                    <div class="text-sm">{formatDateTime(reportDetails.content.createdAt)}</div>
                </div>
            </CardContent>
        </Card>

        <!-- Review Actions -->
        {#if reportDetails.report.status === ContentReportStatusEnum.PENDING}
            <Card>
                <CardHeader>
                    <CardTitle>{m['admin.reports.detail.review-title']()}</CardTitle>
                    <CardDescription>{m['admin.reports.detail.review-description']()}</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-2">
                        <label for="review-notes" class="text-sm font-medium">
                            {m['admin.reports.detail.review-notes-label']()}
                        </label>
                        <Textarea id="review-notes" bind:value={reviewNotes} placeholder={m['admin.reports.detail.review-notes-placeholder']()} rows={4} disabled={isSubmitting} />
                    </div>

                    <div class="space-y-3">
                        <div class="flex gap-3">
                            <Button variant="default" onclick={() => handleReview(ContentReportStatusEnum.REVIEWED)} disabled={isSubmitting} class="flex-1">
                                <CheckCircle class="mr-2 size-4" />
                                {m['admin.reports.detail.action-reviewed']()}
                            </Button>

                            <Button variant="destructive" onclick={() => handleReview(ContentReportStatusEnum.DISMISSED)} disabled={isSubmitting} class="flex-1">
                                <XCircle class="mr-2 size-4" />
                                {m['admin.reports.detail.action-dismissed']()}
                            </Button>
                        </div>

                        <div class="border-t pt-3">
                            <Button variant="destructive" onclick={handleDeleteContent} disabled={isSubmitting} class="w-full">
                                <Trash2 class="mr-2 size-4" />
                                {m['admin.reports.detail.delete-content']()}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        {/if}
    </div>
{:else}
    <Card>
        <CardContent class="py-8 text-center text-muted-foreground">Report not found</CardContent>
    </Card>
{/if}
