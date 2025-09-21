<script lang="ts">
    import { X, Search, ChevronsUpDown, Check } from '@lucide/svelte';
    import { cn } from '#lib/utils';
    import { Button } from '#lib/components/ui/button';
    import { onMount } from 'svelte';

    export type MultiSelectOption = {
        value: number;
        label: string;
        description?: string;
    };

    type Props = {
        options: MultiSelectOption[];
        selectedValues?: number[];
        placeholder?: string;
        maxSelections?: number;
        disabled?: boolean;
        noResultsLabel?: string;
        class?: string;
    };

    let { options, selectedValues = $bindable<string[]>([]), placeholder = '', maxSelections, disabled = false, noResultsLabel = 'Aucun résultat', class: className }: Props = $props();

    let query = $state('');
    let isOpen = $state(false);
    let searchInput = $state<HTMLInputElement | null>(null);
    let containerRef = $state<HTMLDivElement | null>(null);

    const normalizedQuery = $derived(query.trim().toLowerCase());
    const selectedOptions = $derived(options.filter((option) => selectedValues.includes(option.value)));
    const canAddMore = $derived(!maxSelections || selectedValues.length < maxSelections);
    const filteredOptions = $derived(options.filter((option) => (normalizedQuery ? option.label.toLowerCase().includes(normalizedQuery) : true)));

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

    $effect(() => {
        if (isOpen && searchInput) {
            queueMicrotask(() => {
                searchInput?.focus();
                searchInput?.select();
            });
        }
    });

    $effect(() => {
        if (!isOpen) {
            query = '';
        }
    });

    onMount(() => {
        const handleClick = (event: MouseEvent) => {
            if (!isOpen) {
                return;
            }
            if (containerRef && !containerRef.contains(event.target as Node)) {
                isOpen = false;
            }
        };

        window.addEventListener('click', handleClick, { capture: true });

        return () => {
            window.removeEventListener('click', handleClick, { capture: true });
        };
    });
</script>

<div class={cn('flex flex-col gap-3', className)} bind:this={containerRef}>
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

    <Button
        type="button"
        variant="outline"
        class="justify-between rounded-2xl border-white/60 bg-white/85 px-4 py-2 text-sm font-medium text-foreground shadow-md backdrop-blur-xl hover:bg-white/90 disabled:opacity-70 dark:border-slate-800/70 dark:bg-slate-900/70"
        {disabled}
        onclick={() => (isOpen = !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
    >
        <span class={selectedOptions.length === 0 ? 'text-muted-foreground' : ''}>
            {#if selectedOptions.length === 0}
                {placeholder}
            {:else if selectedOptions.length === 1}
                {selectedOptions[0].label}
            {:else}
                {selectedOptions.length} sélectionnées
            {/if}
        </span>
        <ChevronsUpDown class="size-4" />
    </Button>

    {#if isOpen && !disabled}
        <div class="relative z-50">
            <div class="mt-2 w-full rounded-2xl border border-white/50 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80">
                <div class="relative mb-3">
                    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        class="w-full rounded-xl border border-white/50 bg-white/95 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/80"
                        {placeholder}
                        bind:value={query}
                        bind:this={searchInput}
                    />
                </div>
                <div class="max-h-56 overflow-y-auto rounded-xl border border-white/40 bg-white/95 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/80" role="listbox">
                    {#if filteredOptions.length === 0}
                        <p class="px-4 py-3 text-sm text-muted-foreground">{noResultsLabel}</p>
                    {:else}
                        <ul class="divide-y divide-white/40 text-sm dark:divide-slate-800/60">
                            {#each filteredOptions as option (option.value)}
                                {#key option.value}
                                    <li>
                                        <button
                                            type="button"
                                            class={cn(
                                                'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-foreground transition hover:bg-primary/10 hover:text-primary',
                                                selectedValues.includes(option.value) ? 'bg-primary/5' : '',
                                                !selectedValues.includes(option.value) && !canAddMore ? 'opacity-50 cursor-not-allowed' : ''
                                            )}
                                            onclick={() => {
                                                if (!selectedValues.includes(option.value) && !canAddMore) {
                                                    return;
                                                }
                                                toggleOption(option.value);
                                            }}
                                            role="option"
                                            aria-selected={selectedValues.includes(option.value)}
                                        >
                                            <div class="flex flex-col">
                                                <span class="font-medium">{option.label}</span>
                                                {#if option.description}
                                                    <span class="text-xs text-muted-foreground">{option.description}</span>
                                                {/if}
                                            </div>
                                            {#if selectedValues.includes(option.value)}
                                                <Check class="size-4" />
                                            {/if}
                                        </button>
                                    </li>
                                {/key}
                            {/each}
                        </ul>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
