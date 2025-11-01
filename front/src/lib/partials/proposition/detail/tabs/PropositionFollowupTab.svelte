<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import type { PropositionComment } from '#lib/types/proposition';

    const { rolePermissionMatrix, workflowAutomation, comments, formatDateTime, getSectionLabel } = $props<{
        rolePermissionMatrix: Record<string, Record<string, boolean>>;
        workflowAutomation: {
            deliverableRecalcCooldownMinutes: number;
            nonConformityPercentThreshold: number;
            nonConformityAbsoluteFloor: number;
            evaluationAutoShiftDays: number;
            revocationAutoTriggerDelayDays: number;
            revocationCheckFrequencyHours: number;
            deliverableNamingPattern: string;
        };
        comments: PropositionComment[];
        formatDateTime: (value?: string) => string;
        getSectionLabel: (section?: string | null) => string | null;
    }>();
</script>

<section class="space-y-4">
    <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
        <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.followup.permissions']()}</h2>
        {#if Object.keys(rolePermissionMatrix).length}
            <div class="mt-3 overflow-auto">
                <table class="w-full min-w-[320px] table-fixed border-collapse text-left text-sm">
                    <thead>
                        <tr class="text-xs uppercase tracking-wide text-muted-foreground">
                            <th class="border-b border-border/40 px-3 py-2">{m['proposition-detail.followup.role']()}</th>
                            <th class="border-b border-border/40 px-3 py-2">{m['proposition-detail.followup.actions']()}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each Object.entries(rolePermissionMatrix) as [role, actions]}
                            <tr>
                                <td class="border-b border-border/20 px-3 py-2 font-medium text-foreground">{role}</td>
                                <td class="border-b border-border/20 px-3 py-2">
                                    <div class="flex flex-wrap gap-2 text-xs">
                                        {#each Object.entries(actions) as [action, allowed]}
                                            {#if allowed}
                                                <span class="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">{action}</span>
                                            {/if}
                                        {/each}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <p class="mt-2 text-sm text-muted-foreground">{m['proposition-detail.followup.permissions-empty']()}</p>
        {/if}
    </article>

    <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
        <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.followup.automation.title']()}</h2>
        <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
                {m['proposition-detail.followup.automation.recalcCooldown']({ minutes: workflowAutomation.deliverableRecalcCooldownMinutes })}
            </li>
            <li>
                {m['proposition-detail.followup.automation.nonConformityPercent']({
                    percent: workflowAutomation.nonConformityPercentThreshold,
                })}
            </li>
            <li>
                {m['proposition-detail.followup.automation.nonConformityFloor']({
                    count: workflowAutomation.nonConformityAbsoluteFloor,
                })}
            </li>
            <li>
                {m['proposition-detail.followup.automation.evaluationShift']({
                    days: workflowAutomation.evaluationAutoShiftDays,
                })}
            </li>
            <li>
                {m['proposition-detail.followup.automation.revocationDelay']({
                    days: workflowAutomation.revocationAutoTriggerDelayDays,
                })}
            </li>
            <li>
                {m['proposition-detail.followup.automation.revocationFrequency']({
                    hours: workflowAutomation.revocationCheckFrequencyHours,
                })}
            </li>
            <li>{m['proposition-detail.followup.automation.pattern']({ pattern: workflowAutomation.deliverableNamingPattern })}</li>
        </ul>
    </article>

    <article class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
        <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.followup']()}</h2>
        {#if comments.length}
            <ul class="mt-4 space-y-3">
                {#each comments as comment (comment.id)}
                    <li id="comment-{comment.id}" class="rounded-xl border border-border/40 p-4 {comment.isHidden ? 'bg-red-50 dark:bg-red-950/20' : 'bg-card/60'}">
                        <div class="flex items-center justify-between text-xs text-muted-foreground">
                            <div class="flex items-center gap-2">
                                <span>{comment.author?.username ?? m['proposition-detail.comments.anonymous']()}</span>
                                {#if getSectionLabel(comment.section)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{getSectionLabel(comment.section)}</span>
                                {/if}
                            </div>
                            <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p class="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.comments.empty']()}</p>
        {/if}
    </article>
</section>
