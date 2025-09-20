<script lang="ts">
    import { X, Search } from '@lucide/svelte';
    import { cn } from '#lib/utils';

    export type MultiSelectOption = {
        value: string;
        label: string;
        description?: string;
    };

    type Props = {
        options: MultiSelectOption[];
        selectedValues?: string[];
        placeholder?: string;
        maxSelections?: number;
        disabled?: boolean;
        noResultsLabel?: string;
        class?: string;
    };

    let { options, selectedValues = $bindable<string[]>([]), placeholder = '', maxSelections, disabled = false, noResultsLabel = 'Aucun résultat', class: className }: Props = $props();

    let query = $state('');

    const normalizedQuery = $derived(query.trim().toLowerCase());
    const selectedOptions = $derived(options.filter((option) => selectedValues.includes(option.value)));
    const canAddMore = $derived(!maxSelections || selectedValues.length < maxSelections);
    const filteredOptions = $derived(
        options.filter((option) => !selectedValues.includes(option.value)).filter((option) => (normalizedQuery ? option.label.toLowerCase().includes(normalizedQuery) : true))
    );

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            selectedValues = selectedValues.filter((item) => item !== value);
            return;
        }

        if (!canAddMore) {
            return;
        }

        selectedValues = [...selectedValues, value];
        query = '';
    };

    const removeOption = (value: string) => {
        selectedValues = selectedValues.filter((item) => item !== value);
    };
</script>

<div class={cn('flex flex-col gap-3', className)}>
    <div class="flex flex-wrap items-center gap-2 min-h-10 rounded-2xl border border-white/45 bg-white/75 px-3 py-2 shadow-inner backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70">
        {#if selectedOptions.length === 0}
            <span class="text-sm text-muted-foreground">{placeholder}</span>
        {:else}
            {#each selectedOptions as option (option.value)}
                <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-1 text-sm font-medium text-primary transition hover:bg-primary/25"
                    onclick={() => removeOption(option.value)}
                    {disabled}
                    aria-label={`Retirer ${option.label}`}
                >
                    <span>{option.label}</span>
                    <X class="size-4" />
                </button>
            {/each}
        {/if}
    </div>

    {#if !disabled && canAddMore}
        <div class="relative">
            <input
                type="text"
                class="w-full rounded-2xl border border-white/45 bg-white/85 px-4 py-2 pr-10 text-sm text-foreground outline-none shadow-md backdrop-blur-xl transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-900/70"
                {placeholder}
                bind:value={query}
            />
            <Search class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div class="max-h-48 overflow-y-auto rounded-2xl border border-white/35 bg-white/90 shadow-lg backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-900/80">
            {#if filteredOptions.length === 0}
                <p class="px-4 py-3 text-sm text-muted-foreground">{noResultsLabel}</p>
            {:else}
                <ul class="divide-y divide-white/30 text-sm dark:divide-slate-800/60">
                    {#each filteredOptions as option (option.value)}
                        <li>
                            <button
                                type="button"
                                class="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-foreground transition hover:bg-primary/10 hover:text-primary"
                                onclick={() => toggleOption(option.value)}
                            >
                                <span class="font-medium">{option.label}</span>
                                {#if option.description}
                                    <span class="text-xs text-muted-foreground">{option.description}</span>
                                {/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>
