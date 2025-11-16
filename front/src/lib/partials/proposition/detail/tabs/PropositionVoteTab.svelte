<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import type { PropositionVote, WorkflowRole, VoteOption } from '#lib/types/proposition';
    import { PropositionVoteMethodEnum, PropositionVotePhaseEnum } from 'backend/types';
    import { Plus, Pencil, Trash2, CheckCircle } from '@lucide/svelte';

    const {
        votes,
        currentTime,
        canConfigureVote,
        canParticipateVote,
        workflowRole,
        userBallots = {},
        ballotSelections = {},
        isCastingVote = {},
        voteResults = {},
        onAddVote,
        onEditVote,
        onPublishVote,
        onOpenVote,
        onCloseVote,
        onDeleteVote,
        onCastBallot,
        onRevokeBallot,
        getVoteTimeRemaining,
        formatDateTime,
        translateVoteMethod,
        translateVotePhase,
        onBallotSelectionChange,
    } = $props<{
        votes: PropositionVote[];
        currentTime: Date;
        canConfigureVote: boolean;
        canParticipateVote: boolean;
        workflowRole: WorkflowRole;
        userBallots?: Record<string, any>;
        ballotSelections?: Record<string, any>;
        isCastingVote?: Record<string, boolean>;
        voteResults?: Record<string, any>;
        onAddVote: () => void;
        onEditVote: (vote: PropositionVote) => void;
        onPublishVote: (voteId: string) => void;
        onOpenVote: (voteId: string) => void;
        onCloseVote: (voteId: string) => void;
        onDeleteVote: (voteId: string) => void;
        onCastBallot: (vote: PropositionVote) => Promise<void>;
        onRevokeBallot: (voteId: string) => Promise<void>;
        getVoteTimeRemaining: (vote: PropositionVote, currentTime: Date) => { text: string; color: string } | null;
        formatDateTime: (value?: string) => string;
        translateVoteMethod: (method: PropositionVoteMethodEnum) => string;
        translateVotePhase: (phase: PropositionVotePhaseEnum) => string;
        onBallotSelectionChange: (voteId: string, type: 'radio' | 'checkbox' | 'rating', value: any) => void;
    }>();

    // Check if vote end date has passed
    const isVoteEndDatePassed = (vote: PropositionVote): boolean => {
        if (!vote.closeAt) return false;
        return new Date(vote.closeAt) <= currentTime;
    };

    // Check if user can close the vote
    const canCloseVote = (vote: PropositionVote): boolean => {
        if (vote.status !== 'open') return false;
        // Admins can close anytime
        if (workflowRole === 'admin') return true;
        // Initiators can close after end date
        if ((workflowRole === 'initiator' || canConfigureVote) && isVoteEndDatePassed(vote)) return true;
        return false;
    };
</script>

<section class="rounded-2xl bg-background/60 p-6 shadow-sm ring-1 ring-border/40">
    <h2 class="text-lg font-semibold text-foreground">{m['proposition-detail.tabs.vote']()}</h2>
    {#if canConfigureVote}
        <div class="mt-4 flex justify-end">
            <Button variant="outline" class="gap-2" onclick={onAddVote}>
                <Plus class="size-4" />
                {m['proposition-detail.votes.add']()}
            </Button>
        </div>
    {/if}
    {#if votes.length}
        <ul class="mt-4 space-y-4">
            {#each votes as vote (vote.id)}
                <li class="rounded-xl border border-border/40 bg-card/60 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div class="flex-1">
                            <p class="font-semibold text-foreground">{vote.title}</p>
                            <p class="text-xs text-muted-foreground">{m['proposition-detail.vote.method']({ method: translateVoteMethod(vote.method as PropositionVoteMethodEnum) })}</p>
                            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {#if vote.openAt}
                                    <span>{m['proposition-detail.votes.dates.opens']()} : {formatDateTime(vote.openAt)}</span>
                                {/if}
                                {#if vote.closeAt}
                                    <span>{m['proposition-detail.votes.dates.closes']()} : {formatDateTime(vote.closeAt)}</span>
                                {/if}
                            </div>
                            {#if getVoteTimeRemaining(vote, currentTime)}
                                {@const timeInfo = getVoteTimeRemaining(vote, currentTime)}
                                {#if timeInfo}
                                    <p class="mt-1 text-xs font-medium {timeInfo.color}">{timeInfo.text}</p>
                                {/if}
                            {/if}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">{translateVotePhase(vote.phase)}</span>
                            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{vote.status}</span>
                            {#if canConfigureVote}
                                {#if vote.status === 'draft' || (workflowRole === 'admin' && vote.status === 'scheduled')}
                                    <Button size="sm" variant="ghost" class="gap-1" onclick={() => onEditVote(vote)}>
                                        <Pencil class="size-3.5" />
                                        {m['common.edit']()}
                                    </Button>
                                {/if}
                                {#if vote.status === 'draft'}
                                    <Button size="sm" variant="default" class="gap-1" onclick={() => onPublishVote(vote.id)}>
                                        <CheckCircle class="size-3.5" />
                                        {m['proposition-detail.votes.actions.publish']()}
                                    </Button>
                                {/if}
                                {#if workflowRole === 'admin' && vote.status === 'scheduled'}
                                    <Button size="sm" variant="default" class="gap-1" onclick={() => onOpenVote(vote.id)}>
                                        <CheckCircle class="size-3.5" />
                                        {m['proposition-detail.votes.actions.open']()}
                                    </Button>
                                {/if}
                                {#if canCloseVote(vote)}
                                    <Button size="sm" variant="outline" class="gap-1" onclick={() => onCloseVote(vote.id)}>{m['proposition-detail.votes.actions.close']()}</Button>
                                {/if}
                                {#if workflowRole === 'admin' && (vote.status === 'draft' || vote.status === 'scheduled')}
                                    <Button size="sm" variant="ghost" class="gap-1 text-destructive hover:text-destructive" onclick={() => onDeleteVote(vote.id)}>
                                        <Trash2 class="size-3.5" />
                                        {m['common.delete']()}
                                    </Button>
                                {/if}
                            {/if}
                        </div>
                    </div>
                    {#if vote.description}
                        <p class="mt-2 text-sm text-foreground/80">{vote.description}</p>
                    {/if}

                    <!-- Show options list only if user can't vote or has already voted -->
                    {#if !(vote.status === 'open' && canParticipateVote && !userBallots[vote.id])}
                        <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
                            {#each vote.options as option (option.id)}
                                <li class="rounded border border-border/30 bg-background/80 px-3 py-2">
                                    <span class="font-medium text-foreground">{option.label}</span>
                                    {#if option.description}
                                        <p class="text-xs text-muted-foreground">{option.description}</p>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}

                    <!-- Vote casting UI -->
                    {#if vote.status === 'open' && canParticipateVote}
                        {#if userBallots[vote.id]}
                            <div class="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                                ✓ {m['proposition-detail.votes.status.voted-message']()}
                                <Button size="sm" variant="ghost" class="ml-2 text-xs text-destructive hover:text-destructive" onclick={() => onRevokeBallot(vote.id)}>
                                    {m['proposition-detail.votes.actions.revoke']()}
                                </Button>
                            </div>
                        {:else}
                            <div class="mt-4 rounded-lg border border-border/40 bg-background/50 p-4">
                                <h4 class="mb-3 text-sm font-semibold text-foreground">{m['proposition-detail.votes.actions.vote-title']()}</h4>

                                {#if vote.method === PropositionVoteMethodEnum.BINARY}
                                    <!-- Binary vote: radio buttons -->
                                    <div class="space-y-2">
                                        {#each vote.options as option (option.id)}
                                            <label class="flex cursor-pointer items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2 hover:border-primary/40">
                                                <input
                                                    type="radio"
                                                    name="vote-{vote.id}"
                                                    value={option.id}
                                                    checked={ballotSelections[vote.id] === option.id}
                                                    onchange={() => onBallotSelectionChange(vote.id, 'radio', option.id)}
                                                    class="size-4"
                                                />
                                                <div class="flex-1">
                                                    <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                    {#if option.description}
                                                        <p class="text-xs text-muted-foreground">{option.description}</p>
                                                    {/if}
                                                </div>
                                            </label>
                                        {/each}
                                    </div>
                                    <Button class="mt-3 w-full" onclick={() => onCastBallot(vote)} disabled={!ballotSelections[vote.id] || isCastingVote[vote.id]}>
                                        {isCastingVote[vote.id] ? m['proposition-detail.votes.actions.submitting']() : m['proposition-detail.votes.actions.confirm']()}
                                    </Button>
                                {:else if vote.method === PropositionVoteMethodEnum.MULTI_CHOICE}
                                    <!-- Multi-choice: checkboxes with max selections -->
                                    <p class="mb-2 text-xs text-muted-foreground">
                                        {m['proposition-detail.votes.instructions.multi-choice']({ max: vote.maxSelections ?? 1, plural: (vote.maxSelections ?? 1) > 1 ? 's' : '' })}
                                    </p>
                                    <div class="space-y-2">
                                        {#each vote.options as option (option.id)}
                                            {@const selected = ballotSelections[vote.id] || []}
                                            {@const isChecked = selected.includes(option.id)}
                                            {@const canCheck = isChecked || selected.length < (vote.maxSelections || 1)}
                                            <label
                                                class="flex cursor-pointer items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2 {canCheck
                                                    ? 'hover:border-primary/40'
                                                    : 'opacity-50'}"
                                            >
                                                <input
                                                    type="checkbox"
                                                    value={option.id}
                                                    checked={isChecked}
                                                    disabled={!canCheck}
                                                    onchange={(e) => {
                                                        const target = e.target as HTMLInputElement;
                                                        const currentSelections = ballotSelections[vote.id] || [];
                                                        const newSelections = target.checked ? [...currentSelections, option.id] : currentSelections.filter((id: string) => id !== option.id);
                                                        onBallotSelectionChange(vote.id, 'checkbox', newSelections);
                                                    }}
                                                    class="size-4"
                                                />
                                                <div class="flex-1">
                                                    <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                    {#if option.description}
                                                        <p class="text-xs text-muted-foreground">{option.description}</p>
                                                    {/if}
                                                </div>
                                            </label>
                                        {/each}
                                    </div>
                                    <Button class="mt-3 w-full" onclick={() => onCastBallot(vote)} disabled={!ballotSelections[vote.id]?.length || isCastingVote[vote.id]}>
                                        {isCastingVote[vote.id] ? m['proposition-detail.votes.actions.submitting']() : m['proposition-detail.votes.actions.confirm']()}
                                    </Button>
                                {:else if vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT}
                                    <!-- Majority judgment: rating dropdown for each option -->
                                    <p class="mb-2 text-xs text-muted-foreground">{m['proposition-detail.votes.instructions.majority-judgment']()}</p>
                                    <div class="space-y-2">
                                        {#each vote.options as option (option.id)}
                                            <div class="flex items-center gap-3 rounded-md border border-border/30 bg-background px-3 py-2">
                                                <div class="flex-1">
                                                    <span class="text-sm font-medium text-foreground">{option.label}</span>
                                                    {#if option.description}
                                                        <p class="text-xs text-muted-foreground">{option.description}</p>
                                                    {/if}
                                                </div>
                                                <select
                                                    class="rounded border border-border/60 bg-background px-2 py-1 text-sm"
                                                    value={(ballotSelections[vote.id] || {})[option.id]?.toString() ?? ''}
                                                    onchange={(e) => {
                                                        const target = e.target as HTMLSelectElement;
                                                        const currentRatings = ballotSelections[vote.id] || {};
                                                        onBallotSelectionChange(vote.id, 'rating', { ...currentRatings, [option.id]: Number(target.value) });
                                                    }}
                                                >
                                                    <option value="">--</option>
                                                    <option value="0">0</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                    <option value="4">4</option>
                                                    <option value="5">5</option>
                                                </select>
                                            </div>
                                        {/each}
                                    </div>
                                    {@const ratings = ballotSelections[vote.id] || {}}
                                    {@const allRated = vote.options.every((opt: VoteOption) => ratings[opt.id] !== undefined)}
                                    <Button class="mt-3 w-full" onclick={() => onCastBallot(vote)} disabled={!allRated || isCastingVote[vote.id]}>
                                        {isCastingVote[vote.id] ? m['proposition-detail.votes.actions.submitting']() : m['proposition-detail.votes.actions.confirm']()}
                                    </Button>
                                {/if}
                            </div>
                        {/if}
                    {/if}

                    <!-- Vote results -->
                    {#if vote.status === 'closed' && voteResults[vote.id]}
                        {@const results = voteResults[vote.id]}
                        <div class="mt-4 rounded-lg border border-border/40 bg-background/50 p-4">
                            <h4 class="mb-3 text-sm font-semibold text-foreground">
                                {m['proposition-detail.votes.results.title']()} ({m['proposition-detail.votes.results.votes-count']({
                                    count: results.totalVotes,
                                    plural: results.totalVotes > 1 ? 's' : '',
                                })})
                            </h4>

                            {#if vote.method === PropositionVoteMethodEnum.BINARY || vote.method === PropositionVoteMethodEnum.MULTI_CHOICE}
                                {@const optionCounts = results.optionCounts || {}}
                                <div class="space-y-2">
                                    {#each vote.options as option (option.id)}
                                        {@const count = optionCounts[option.id] || 0}
                                        {@const percentage = results.totalVotes > 0 ? Math.round((count / results.totalVotes) * 100) : 0}
                                        <div class="rounded-md border border-border/30 bg-background px-3 py-2">
                                            <div class="flex items-center justify-between text-sm">
                                                <span class="font-medium text-foreground">{option.label}</span>
                                                <span class="text-xs text-muted-foreground">{count} ({percentage}%)</span>
                                            </div>
                                            <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                                                <div class="h-full bg-primary transition-all" style="width: {percentage}%"></div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {:else if vote.method === PropositionVoteMethodEnum.MAJORITY_JUDGMENT}
                                {@const optionRatings = results.optionRatings || {}}
                                <div class="space-y-2">
                                    {#each vote.options as option (option.id)}
                                        {@const stats = optionRatings[option.id] || { median: 0, average: 0 }}
                                        {@const median = stats.median ?? 0}
                                        {@const average = stats.average ?? 0}
                                        <div class="rounded-md border border-border/30 bg-background px-3 py-2">
                                            <div class="flex items-center justify-between text-sm">
                                                <span class="font-medium text-foreground">{option.label}</span>
                                                <span class="text-xs text-muted-foreground">
                                                    {m['proposition-detail.votes.results.median']()}: {median} | {m['proposition-detail.votes.results.average']()}: {average.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {:else}
        <p class="mt-4 text-sm text-muted-foreground">{m['proposition-detail.votes.empty']()}</p>
    {/if}
</section>
