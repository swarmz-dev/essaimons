<script context="module" lang="ts">
    export type TabItem = {
        id: string;
        label: string;
        disabled?: boolean;
        badge?: string;
    };
</script>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let items: TabItem[] = [];
    export let value: string;
    export let ariaLabel: string | null = null;

    const dispatch = createEventDispatcher<{ change: string }>();

    let tabButtons: Array<HTMLButtonElement | null> = [];

    const register = (node: HTMLButtonElement, index: number) => {
        tabButtons[index] = node;
        return {
            destroy: () => {
                tabButtons[index] = null;
            },
        };
    };

    const focusTab = (targetIndex: number): void => {
        const total = items.length;
        if (!total) {
            return;
        }

        let index = ((targetIndex % total) + total) % total;
        const visited = new Set<number>();

        while (!visited.has(index)) {
            visited.add(index);
            const candidate = tabButtons[index];
            if (candidate && !items[index]?.disabled) {
                candidate.focus();
                return;
            }
            index = (index + 1) % total;
        }
    };

    const moveFocus = (currentIndex: number, direction: 1 | -1): void => {
        const total = items.length;
        if (!total) {
            return;
        }

        let index = currentIndex;
        const visited = new Set<number>();

        while (!visited.has(index)) {
            index = (index + direction + total) % total;
            visited.add(index);
            const candidate = tabButtons[index];
            if (candidate && !items[index]?.disabled) {
                candidate.focus();
                return;
            }
        }
    };

    const selectTab = (item: TabItem): void => {
        if (item.disabled || value === item.id) {
            return;
        }
        value = item.id;
        dispatch('change', item.id);
    };

    const handleKeydown = (event: KeyboardEvent, index: number, item: TabItem): void => {
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                moveFocus(index, 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                moveFocus(index, -1);
                break;
            case 'Home':
                event.preventDefault();
                focusTab(0);
                break;
            case 'End':
                event.preventDefault();
                focusTab(items.length - 1);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                selectTab(item);
                break;
            default:
                break;
        }
    };
</script>

<div role="tablist" class="flex flex-wrap gap-2" aria-label={ariaLabel ?? undefined}>
    {#each items as item, index (item.id)}
        <button
            use:register={index}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            class="flex items-center gap-2 rounded-full border border-border/40 px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            class:aria-selected={value === item.id}
            aria-selected={value === item.id}
            tabindex={value === item.id ? 0 : -1}
            aria-controls={`panel-${item.id}`}
            aria-disabled={item.disabled ? 'true' : 'false'}
            disabled={item.disabled}
            on:click={() => selectTab(item)}
            on:keydown={(event) => handleKeydown(event, index, item)}
        >
            <span>{item.label}</span>
            {#if item.badge}
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{item.badge}</span>
            {/if}
        </button>
    {/each}
</div>

<style>
    button[role='tab'][aria-selected='true'] {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        background-color: hsl(var(--primary) / 0.1);
    }
</style>
