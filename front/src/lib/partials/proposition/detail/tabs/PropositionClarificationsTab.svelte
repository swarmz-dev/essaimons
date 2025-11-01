<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import type { PropositionComment } from '#lib/types/proposition';
    import { ContentTypeEnum } from 'backend/types';
    import { Plus, Pencil, Trash2, Flag } from '@lucide/svelte';

    const { comments, canCommentClarification, onAddComment, onReplyComment, onEditComment, onDeleteComment, onReportComment, formatDateTime, getSectionLabel } = $props<{
        comments: PropositionComment[];
        canCommentClarification: boolean;
        onAddComment: () => void;
        onReplyComment: (parentId: string) => void;
        onEditComment: (commentId: string, content: string, parentId?: string | null) => void;
        onDeleteComment: (commentId: string, parentId?: string | null) => void;
        onReportComment: (contentType: ContentTypeEnum, contentId: string, description: string) => void;
        formatDateTime: (value?: string) => string;
        getSectionLabel: (section?: string | null) => string | null;
    }>();
</script>

<section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
    <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.clarifications']()}</h2>
    {#if canCommentClarification}
        <div class="mt-4 flex justify-end">
            <Button variant="outline" class="gap-2" onclick={onAddComment}>
                <Plus class="size-4" />
                {m['proposition-detail.comments.add']()}
            </Button>
        </div>
    {/if}
    {#if comments.length}
        <ul class="mt-4 space-y-4">
            {#each comments as comment (comment.id)}
                <li id="comment-{comment.id}" class="space-y-3 rounded-xl border border-border/40 p-4 {comment.isHidden ? 'bg-red-50 dark:bg-red-950/20' : 'bg-card/60'}">
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
                                <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditComment(comment.id, comment.content)}>
                                    <Pencil class="size-3.5" />
                                    {m['proposition-detail.comments.edit']()}
                                </Button>
                                {#if (comment.replies ?? []).length === 0}
                                    <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteComment(comment.id)}>
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
                    {#if canCommentClarification}
                        <div class="flex flex-wrap justify-end">
                            <Button size="sm" variant="ghost" class="gap-1" onclick={() => onReplyComment(comment.id)}>
                                <Plus class="size-3.5" />
                                {m['proposition-detail.comments.reply']()}
                            </Button>
                        </div>
                    {/if}
                    {#if (comment.replies ?? []).length}
                        <ul class="ml-4 space-y-2 border-l border-border/30 pl-4">
                            {#each comment.replies ?? [] as reply (reply.id)}
                                <li id="comment-{reply.id}" class="space-y-1 rounded-lg p-3 {reply.isHidden ? 'bg-red-50 dark:bg-red-950/20' : 'bg-background/60'}">
                                    <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                        <span>{reply.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                        <div class="flex items-center gap-2">
                                            <span>{formatDateTime(reply.createdAt)}</span>
                                            {#if reply.editable}
                                                <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditComment(reply.id, reply.content, comment.id)}>
                                                    <Pencil class="size-3" />
                                                    {m['proposition-detail.comments.edit']()}
                                                </Button>
                                                <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteComment(reply.id, comment.id)}>
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
        <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
    {/if}
</section>
