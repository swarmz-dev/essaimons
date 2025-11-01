<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import type { PropositionComment, PropositionEvent } from '#lib/types/proposition';
    import { ContentTypeEnum, PropositionEventTypeEnum } from 'backend/types';
    import { Plus, Pencil, Trash2, Eye, Flag } from '@lucide/svelte';

    const {
        events,
        comments,
        canManageEvents,
        canCommentAmendment,
        onAddEvent,
        onViewEvent,
        onEditEvent,
        onDeleteEvent,
        isEventEditableByCurrentUser,
        onAddAmendmentComment,
        onReplyAmendmentComment,
        onEditAmendmentComment,
        onDeleteAmendmentComment,
        onReportComment,
        formatDateTime,
        translateEventType,
        getSectionLabel,
    } = $props<{
        events: PropositionEvent[];
        comments: PropositionComment[];
        canManageEvents: boolean;
        canCommentAmendment: boolean;
        onAddEvent: () => void;
        onViewEvent: (eventId: string) => void;
        onEditEvent: (event: PropositionEvent) => void;
        onDeleteEvent: (eventId: string) => void;
        isEventEditableByCurrentUser: (event: PropositionEvent) => boolean;
        onAddAmendmentComment: () => void;
        onReplyAmendmentComment: (parentId: string) => void;
        onEditAmendmentComment: (commentId: string, content: string, parentId?: string | null) => void;
        onDeleteAmendmentComment: (commentId: string, parentId?: string | null) => void;
        onReportComment: (contentType: ContentTypeEnum, contentId: string, description: string) => void;
        formatDateTime: (value?: string) => string;
        translateEventType: (type: PropositionEventTypeEnum) => string;
        getSectionLabel: (section?: string | null) => string | null;
    }>();
</script>

<section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40 space-y-6">
    <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.amendments']()}</h2>
        <div class="flex flex-wrap justify-end gap-2">
            {#if canManageEvents}
                <Button variant="outline" class="gap-2" onclick={onAddEvent}>
                    <Plus class="size-4" />
                    {m['proposition-detail.events.add']()}
                </Button>
            {/if}
            {#if canCommentAmendment}
                <Button variant="outline" class="gap-2" onclick={onAddAmendmentComment}>
                    <Plus class="size-4" />
                    {m['proposition-detail.comments.add-amendment']()}
                </Button>
            {/if}
        </div>
    </div>
    {#if events.length}
        <ul class="mt-4 space-y-3">
            {#each events as event (event.id)}
                <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="space-y-1">
                            <p class="font-semibold text-foreground">{event.title}</p>
                            <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{translateEventType(event.type)}</span>
                                {#if event.startAt && event.endAt}
                                    <span>{formatDateTime(event.startAt)} – {formatDateTime(event.endAt)}</span>
                                {:else if event.startAt}
                                    <span>{formatDateTime(event.startAt)}</span>
                                {:else if event.endAt}
                                    <span>{formatDateTime(event.endAt)}</span>
                                {/if}
                                {#if event.location}
                                    <span>{event.location}</span>
                                {/if}
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="ghost" class="gap-1" onclick={() => onViewEvent(event.id)}>
                                <Eye class="size-4" />
                                {m['common.view']()}
                            </Button>
                            {#if isEventEditableByCurrentUser(event)}
                                <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditEvent(event)}>
                                    <Pencil class="size-3.5" />
                                    {m['common.edit']()}
                                </Button>
                                <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteEvent(event.id)}>
                                    <Trash2 class="size-3.5" />
                                    {m['common.delete']()}
                                </Button>
                            {/if}
                        </div>
                    </div>
                    {#if event.description}
                        <p class="mt-3 text-sm text-foreground/80 whitespace-pre-wrap">{event.description}</p>
                    {/if}
                    {#if event.videoLink}
                        <p class="mt-2 text-xs text-muted-foreground">
                            <a href={event.videoLink} target="_blank" rel="noreferrer" class="underline underline-offset-2">
                                {event.videoLink}
                            </a>
                        </p>
                    {/if}
                </li>
            {/each}
        </ul>
    {:else}
        <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.events.empty']()}</p>
    {/if}
    <div class="space-y-3">
        <h3 class="text-sm font-semibold text-foreground">{m['proposition-detail.comments.section.amendment']()}</h3>
        {#if comments.length}
            <ul class="space-y-3">
                {#each comments as comment (comment.id)}
                    <li id="comment-{comment.id}" class="space-y-3 rounded-xl border border-border/40 bg-card/60 p-4">
                        <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <div class="flex items-center gap-2">
                                <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                {#if getSectionLabel(comment.section)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{getSectionLabel(comment.section)}</span>
                                {/if}
                            </div>
                            <div class="flex items-center gap-2">
                                <span>{formatDateTime(comment.createdAt)}</span>
                                {#if comment.editable}
                                    <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditAmendmentComment(comment.id, comment.content)}>
                                        <Pencil class="size-3.5" />
                                        {m['proposition-detail.comments.edit']()}
                                    </Button>
                                    {#if (comment.replies ?? []).length === 0}
                                        <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteAmendmentComment(comment.id)}>
                                            <Trash2 class="size-3.5" />
                                            {m['proposition-detail.comments.delete']()}
                                        </Button>
                                    {/if}
                                {:else}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        class="gap-1 text-muted-foreground hover:text-foreground"
                                        onclick={() =>
                                            onReportComment(
                                                ContentTypeEnum.COMMENT,
                                                comment.id,
                                                `${comment.author?.username ?? m['proposition-detail.comments.anonymous']()}: ${comment.content.slice(0, 50)}...`
                                            )}
                                    >
                                        <Flag class="size-3.5" />
                                        {m['report.button']()}
                                    </Button>
                                {/if}
                            </div>
                        </div>
                        <p class="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                        {#if canCommentAmendment}
                            <div class="flex flex-wrap justify-end">
                                <Button size="sm" variant="ghost" class="gap-1" onclick={() => onReplyAmendmentComment(comment.id)}>
                                    <Plus class="size-3.5" />
                                    {m['proposition-detail.comments.reply']()}
                                </Button>
                            </div>
                        {/if}
                        {#if (comment.replies ?? []).length}
                            <ul class="ml-4 space-y-2 border-l border-border/30 pl-4">
                                {#each comment.replies ?? [] as reply (reply.id)}
                                    <li id="comment-{reply.id}" class="space-y-1 rounded-lg bg-background/60 p-3">
                                        <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                            <span>{reply.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                            <div class="flex items-center gap-2">
                                                <span>{formatDateTime(reply.createdAt)}</span>
                                                {#if reply.editable}
                                                    <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditAmendmentComment(reply.id, reply.content, comment.id)}>
                                                        <Pencil class="size-3" />
                                                        {m['proposition-detail.comments.edit']()}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        class="gap-1 text-destructive hover:text-destructive"
                                                        onclick={() => onDeleteAmendmentComment(reply.id, comment.id)}
                                                    >
                                                        <Trash2 class="size-3" />
                                                        {m['proposition-detail.comments.delete']()}
                                                    </Button>
                                                {:else}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        class="gap-1 text-muted-foreground hover:text-foreground"
                                                        onclick={() =>
                                                            onReportComment(
                                                                ContentTypeEnum.COMMENT,
                                                                reply.id,
                                                                `${reply.author?.username ?? m['proposition-detail.comments.anonymous']()}: ${reply.content.slice(0, 50)}...`
                                                            )}
                                                    >
                                                        <Flag class="size-3" />
                                                        {m['report.button']()}
                                                    </Button>
                                                {/if}
                                            </div>
                                        </div>
                                        <p class="text-sm text-foreground/85 whitespace-pre-wrap">{reply.content}</p>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
        {/if}
    </div>
</section>
