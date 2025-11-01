<script lang="ts">
    import { goto } from '$app/navigation';
    import { Button, buttonVariants } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { cn } from '#lib/utils';
    import type { SerializedProposition, SerializedPropositionSummary } from 'backend/types';
    import { Download, MessageCircle } from '@lucide/svelte';

    const { proposition, canCommentOnSection, openCommentForSection, formatFileSize } = $props<{
        proposition: SerializedProposition;
        canCommentOnSection: boolean;
        openCommentForSection: (section: string) => void;
        formatFileSize: (size: number) => string;
    }>();

    const attachmentUrl = (fileId: string): string => `/assets/propositions/attachments/${fileId}`;

    const openAssociated = async (linked: SerializedPropositionSummary): Promise<void> => {
        await goto(`/propositions/${linked.id}`);
    };

    const hasExpertise = $derived(Boolean(proposition.expertise && proposition.expertise.trim().length));
    const hasRescueInitiators = $derived((proposition.rescueInitiators ?? []).length > 0);
    const hasAssociated = $derived((proposition.associatedPropositions ?? []).length > 0);
    const hasAttachments = $derived((proposition.attachments ?? []).length > 0);

    // These fields are always created with RichTextEditor, so always render as HTML
    const detailedDescriptionHasHtml = $derived(true);
    const smartObjectivesHasHtml = $derived(true);
    const impactsHasHtml = $derived(true);
    const mandatesHasHtml = $derived(true);

    const HTML_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z][^>]*>/;
    const containsHtml = (value?: string | null): boolean => {
        if (!value) {
            return false;
        }
        return HTML_TAG_PATTERN.test(value);
    };

    const expertiseHasHtml = $derived(containsHtml(proposition.expertise));
</script>

<section class="grid gap-6 lg:grid-cols-[2fr,1fr]">
    <div class="space-y-6">
        <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.description']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('description')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
            {#if detailedDescriptionHasHtml}
                <div class="mt-3 text-sm leading-relaxed text-foreground">
                    {@html proposition.detailedDescription}
                </div>
            {:else}
                <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.detailedDescription}</p>
            {/if}
        </article>
        <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.objectives']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('smart_objectives')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
            {#if smartObjectivesHasHtml}
                <div class="mt-3 text-sm leading-relaxed text-foreground">
                    {@html proposition.smartObjectives}
                </div>
            {:else}
                <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.smartObjectives}</p>
            {/if}
        </article>
        <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.impacts']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('impacts')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
            {#if impactsHasHtml}
                <div class="mt-3 text-sm leading-relaxed text-foreground">
                    {@html proposition.impacts}
                </div>
            {:else}
                <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.impacts}</p>
            {/if}
        </article>
        <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.mandates']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('mandates')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
            {#if mandatesHasHtml}
                <div class="mt-3 text-sm leading-relaxed text-foreground">
                    {@html proposition.mandatesDescription}
                </div>
            {:else}
                <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">{proposition.mandatesDescription}</p>
            {/if}
        </article>
        <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 print:ring-0 print:shadow-none">
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.expertise']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('expertise')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
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
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.rescue']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('rescue')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
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
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.associated']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('associated')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
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
            <div class="flex items-start justify-between">
                <h2 class="text-lg font-semibold">{m['proposition-detail.sections.attachments']()}</h2>
                {#if canCommentOnSection}
                    <button
                        type="button"
                        class="flex items-center gap-2 rounded-md p-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground print:hidden"
                        onclick={() => openCommentForSection('attachments')}
                        title="Ajouter un commentaire"
                    >
                        <MessageCircle class="size-4" />
                    </button>
                {/if}
            </div>
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
