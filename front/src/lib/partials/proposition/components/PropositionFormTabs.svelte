<script lang="ts">
    import { cn } from '#lib/utils';

    type PropositionFormTab = {
        id: string;
        title: string;
        description: string;
    };

    export let tabs: readonly PropositionFormTab[] = [];
    export let activeTab: string;
    export let selectTab: (id: string) => void = () => {};
</script>

<nav class="grid gap-3 sm:grid-cols-3">
    {#each tabs as tab (tab.id)}
        <button
            type="button"
            class={cn(
                'group flex flex-col gap-2 rounded-2xl border border-white/45 bg-white/75 px-4 py-4 text-left shadow-md transition hover:border-primary/50 hover:bg-white/90 dark:border-slate-800/70 dark:bg-slate-900/70',
                activeTab === tab.id ? 'border-primary/70 bg-primary/90 text-primary-foreground' : ''
            )}
            onclick={() => selectTab(tab.id)}
        >
            <span
                class={cn(
                    'text-sm font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-primary dark:group-hover:text-primary',
                    activeTab === tab.id ? 'text-primary-foreground' : ''
                )}
            >
                {tab.title}
            </span>
            <p class={cn('text-sm text-muted-foreground group-hover:text-foreground/90 dark:group-hover:text-foreground/90', activeTab === tab.id ? 'text-primary-foreground/90' : '')}>
                {tab.description}
            </p>
        </button>
    {/each}
</nav>
