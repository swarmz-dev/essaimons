<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Meta from '#components/Meta.svelte';
    import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    } from '#lib/components/ui/alert-dialog';
    import { Button, buttonVariants } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { cn } from '#lib/utils';
    import type { SerializedProposition, SerializedPropositionSummary, SerializedUserSummary } from 'backend/types';
    import { ArrowLeft, Printer, Download, CalendarDays, Pencil, Trash2 } from '@lucide/svelte';

    const { data } = $props<{ data: { proposition: SerializedProposition } }>();
    const proposition = data.proposition;

    const visualUrl = proposition.visual ? `/assets/propositions/visual/${proposition.id}` : undefined;

    const normalizeId = (value?: string | number | null): string | undefined => {
        if (value === undefined || value === null) {
            return undefined;
        }
        const normalized = value.toString().trim();
        return normalized.length ? normalized : undefined;
    };

    let canEditProposition: boolean = $state(false);
    let canDeleteProposition: boolean = $state(false);
    let showDeleteDialog: boolean = $state(false);
    let isDeleteSubmitting: boolean = $state(false);

    $effect(() => {
        const currentUser = page.data.user;
        if (!currentUser) {
            canEditProposition = false;
            canDeleteProposition = false;
            return;
        }

        canDeleteProposition = currentUser.role === 'admin';

        if (canDeleteProposition) {
            canEditProposition = true;
            return;
        }

        const currentUserId = normalizeId((currentUser as any).id ?? (currentUser as any).frontId);
        if (!currentUserId) {
            canEditProposition = false;
            return;
        }

        const creatorId = normalizeId(proposition.creator?.id);
        if (creatorId && creatorId === currentUserId) {
            canEditProposition = true;
            return;
        }

        canEditProposition = proposition.rescueInitiators.some((rescue: SerializedUserSummary) => normalizeId(rescue.id) === currentUserId);
    });

    const handleDeleteSubmit = (): void => {
        isDeleteSubmitting = true;
    };

    const attachmentUrl = (fileId: string): string => `/assets/propositions/attachments/${fileId}`;

    const formatDate = (value?: string): string => {
        if (!value) {
            return m['proposition-detail.dates.empty']();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
    };

    const formatDateTime = (value?: string): string => {
        if (!value) {
            return m['proposition-detail.dates.empty']();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    };

    const formatFileSize = (size: number): string => {
        if (!Number.isFinite(size) || size <= 0) {
            return '';
        }

        const units = ['bytes', 'KB', 'MB', 'GB'];
        let index = 0;
        let value = size;

        while (value >= 1024 && index < units.length - 1) {
            value /= 1024;
            index += 1;
        }

        const formatted = index === 0 ? Math.round(value).toString() : value.toFixed(1);
        return `${formatted} ${units[index]}`;
    };

    const timelineEntries = [
        { label: m['proposition-detail.dates.clarification'](), value: proposition.clarificationDeadline },
        { label: m['proposition-detail.dates.improvement'](), value: proposition.improvementDeadline },
        { label: m['proposition-detail.dates.vote'](), value: proposition.voteDeadline },
        { label: m['proposition-detail.dates.mandate'](), value: proposition.mandateDeadline },
        { label: m['proposition-detail.dates.evaluation'](), value: proposition.evaluationDeadline },
    ];

    const printPage = (): void => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const goBack = async (): Promise<void> => {
        await goto('/propositions');
    };

    const openAssociated = async (linked: SerializedPropositionSummary): Promise<void> => {
        await goto(`/propositions/${linked.id}`);
    };

    const HTML_TAG_PATTERN = /<\/?\s*[a-zA-Z][^>]*>/;
    const containsHtml = (value?: string | null): boolean => {
        if (!value) {
            return false;
        }
        return HTML_TAG_PATTERN.test(value);
    };

    const hasExpertise = Boolean(proposition.expertise && proposition.expertise.trim().length);
    const hasRescueInitiators = proposition.rescueInitiators.length > 0;
    const hasAssociated = proposition.associatedPropositions.length > 0;
    const hasAttachments = proposition.attachments.length > 0;

    const detailedDescriptionHasHtml = containsHtml(proposition.detailedDescription);
    const smartObjectivesHasHtml = containsHtml(proposition.smartObjectives);
    const impactsHasHtml = containsHtml(proposition.impacts);
    const mandatesHasHtml = containsHtml(proposition.mandatesDescription);
    const expertiseHasHtml = containsHtml(proposition.expertise);
</script>

<Meta
    title={m['proposition-detail.meta.title']({ title: proposition.title })}
    description={m['proposition-detail.meta.description']({ summary: proposition.summary })}
    keywords={m['proposition-detail.meta.keywords']().split(', ')}
    pathname={`/propositions/${proposition.id}`}
/>

<div class="proposition-detail space-y-6 lg:space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <div class="flex flex-wrap items-center gap-3">
            <Button variant="outline" class="gap-2" onclick={goBack}>
                <ArrowLeft class="size-4" />
                {m['proposition-detail.actions.back']()}
            </Button>
            {#if canEditProposition}
                <Button variant="outline" class="gap-2" onclick={() => goto(`/propositions/${proposition.id}/edit`)}>
                    <Pencil class="size-4" />
                    {m['common.edit']()}
                </Button>
            {/if}
            {#if canDeleteProposition}
                <Button variant="destructive" class="gap-2" onclick={() => (showDeleteDialog = true)}>
                    <Trash2 class="size-4" />
                    {m['common.delete']()}
                </Button>
            {/if}
        </div>
        <Button variant="secondary" class="gap-2" onclick={printPage}>
            <Printer class="size-4" />
            {m['proposition-detail.actions.print']()}
        </Button>
    </div>

    {#if canDeleteProposition}
        <AlertDialog open={showDeleteDialog} onOpenChange={(value: boolean) => (showDeleteDialog = value)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{m['proposition-detail.delete.title']()}</AlertDialogTitle>
                    <AlertDialogDescription>{m['proposition-detail.delete.description']()}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
                    <form method="POST" action="?/delete" class="inline-flex" onsubmit={handleDeleteSubmit}>
                        <AlertDialogAction type="submit" disabled={isDeleteSubmitting}>
                            {m['proposition-detail.delete.confirm']()}
                        </AlertDialogAction>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    {/if}

    <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex-1 space-y-3">
                <h1 class="text-3xl font-semibold text-foreground sm:text-4xl">{proposition.title}</h1>
                <p class="text-base text-muted-foreground">{proposition.summary}</p>
                <div class="flex flex-wrap gap-2">
                    {#each proposition.categories as category (category.id)}
                        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {category.name}
                        </span>
                    {/each}
                </div>
            </div>
            <div class="flex flex-col gap-2 text-sm text-muted-foreground lg:w-64">
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.creator']()}:</span>
                    <span class="ml-2">{proposition.creator.username}</span>
                </div>
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.created']()}:</span>
                    <span class="ml-2">{formatDateTime(proposition.createdAt)}</span>
                </div>
                <div>
                    <span class="font-semibold text-foreground">{m['proposition-detail.labels.updated']()}:</span>
                    <span class="ml-2">{formatDateTime(proposition.updatedAt)}</span>
                </div>
            </div>
        </div>
        {#if visualUrl}
            <figure class="mt-6 overflow-hidden rounded-2xl border border-border/40 bg-muted/30">
                <img src={visualUrl} alt={m['proposition-detail.visual.alt']({ title: proposition.title })} class="w-full object-cover" loading="lazy" />
            </figure>
        {/if}
    </section>

    <section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarDays class="size-5" />
            {m['proposition-detail.sections.timeline']()}
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each timelineEntries as entry (entry.label)}
                <div class="rounded-xl border border-border/40 bg-card/70 p-4 text-sm print:border-0 print:bg-transparent">
                    <p class="font-semibold text-foreground">{entry.label}</p>
                    <p class="mt-1 text-muted-foreground">{formatDate(entry.value)}</p>
                </div>
            {/each}
        </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div class="space-y-6">
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.description']()}</h2>
                {#if detailedDescriptionHasHtml}
                    <div class="mt-3 text-sm leading-relaxed text-foreground">
                        {@html proposition.detailedDescription}
                    </div>
                {:else}
                    <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.detailedDescription}</p>
                {/if}
            </article>
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.objectives']()}</h2>
                {#if smartObjectivesHasHtml}
                    <div class="mt-3 text-sm leading-relaxed text-foreground">
                        {@html proposition.smartObjectives}
                    </div>
                {:else}
                    <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.smartObjectives}</p>
                {/if}
            </article>
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.impacts']()}</h2>
                {#if impactsHasHtml}
                    <div class="mt-3 text-sm leading-relaxed text-foreground">
                        {@html proposition.impacts}
                    </div>
                {:else}
                    <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.impacts}</p>
                {/if}
            </article>
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.mandates']()}</h2>
                {#if mandatesHasHtml}
                    <div class="mt-3 text-sm leading-relaxed text-foreground">
                        {@html proposition.mandatesDescription}
                    </div>
                {:else}
                    <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.mandatesDescription}</p>
                {/if}
            </article>
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.expertise']()}</h2>
                {#if hasExpertise}
                    {#if expertiseHasHtml}
                        <div class="mt-3 text-sm leading-relaxed text-foreground">
                            {@html proposition.expertise}
                        </div>
                    {:else}
                        <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.expertise}</p>
                    {/if}
                {:else}
                    <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.expertise']()}</p>
                {/if}
            </article>
        </div>

        <aside class="space-y-6">
            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.rescue']()}</h2>
                {#if hasRescueInitiators}
                    <ul class="mt-3 space-y-2 text-sm text-foreground">
                        {#each proposition.rescueInitiators as user (user.id)}
                            <li class="rounded-lg border border-border/40 bg-muted/40 px-3 py-2 print:border-0 print:bg-transparent">
                                {user.username}
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.rescue']()}</p>
                {/if}
            </article>

            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.associated']()}</h2>
                {#if hasAssociated}
                    <ul class="mt-3 space-y-2 text-sm">
                        {#each proposition.associatedPropositions as linked (linked.id)}
                            <li>
                                <Button variant="ghost" size="sm" class="px-0" onclick={() => openAssociated(linked)}>
                                    {linked.title}
                                </Button>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.associated']()}</p>
                {/if}
            </article>

            <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.attachments']()}</h2>
                {#if hasAttachments}
                    <ul class="mt-3 space-y-3 text-sm">
                        {#each proposition.attachments as attachment (attachment.id)}
                            <li class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/30 p-3 print:border-0 print:bg-transparent">
                                <div>
                                    <p class="font-semibold text-foreground">{attachment.name}</p>
                                    <p class="text-xs text-muted-foreground">{attachment.mimeType} • {formatFileSize(attachment.size)}</p>
                                </div>
                                <a href={attachmentUrl(attachment.id)} download={attachment.name} class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
                                    <Download class="size-4" />
                                    {m['proposition-detail.actions.download']()}
                                </a>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="mt-3 text-sm text-muted-foreground">{m['proposition-detail.empty.attachments']()}</p>
                {/if}
            </article>
        </aside>
    </section>
</div>

<style>
    @media print {
        :global(body) {
            background: #fff !important;
            color: #000 !important;
        }

        :global(nav),
        :global(header),
        :global(footer),
        :global([data-slot='sidebar']),
        :global([data-slot='sidebar-gap']),
        :global([data-slot='sidebar-container']),
        :global(main[data-slot='sidebar-inset'] > div:first-child),
        .print-hidden,
        :global(.menu-toggle) {
            display: none !important;
        }

        .proposition-detail {
            gap: 1.5rem !important;
        }

        .proposition-detail section,
        .proposition-detail article,
        .proposition-detail aside {
            box-shadow: none !important;
            background: transparent !important;
        }

        a {
            color: inherit !important;
            text-decoration: underline !important;
        }
    }
</style>
