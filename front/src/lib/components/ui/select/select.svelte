<script lang="ts" module>
    import type { Component } from 'svelte';

    export type SelectItem = {
        value: string | number;
        label: string;
        disabled?: boolean;
        icon?: Component;
    };
</script>

<script lang="ts">
    import { Button } from '#lib/components/ui/button/index';
    import { ChevronDown } from '@lucide/svelte';
    import { onMount } from 'svelte';

    type Props = {
        ref?: HTMLButtonElement;
        selectedItem?: SelectItem;
        isTitleImageOnly?: boolean;
        items: SelectItem[];
        onValueChange?: (item: SelectItem) => void;
    };

    let { ref = $bindable(), selectedItem = $bindable(), isTitleImageOnly, items, onValueChange }: Props = $props();

    let isExpanded = $state(false);

    let containerRef = $state<HTMLDivElement | null>(null);
    let popoverRef = $state<HTMLDivElement | null>(null);

    onMount(() => {
        selectedItem ? selectedItem : (selectedItem = items[0]);

        document.addEventListener('click', handleClickOutside);

        return () => document.removeEventListener('click', handleClickOutside);
    });

    const handleClick = (item: SelectItem) => {
        selectedItem = item;
        isExpanded = false;
        onValueChange?.(item);
    };

    const handleClickOutside = (event: MouseEvent): void => {
        if (popoverRef && !containerRef?.contains(event.target as Node) && !popoverRef.contains(event.target as Node)) {
            isExpanded = false;
        }
    };
</script>

<div class="relative inline-block" bind:this={containerRef}>
    <Button variant="outline" class="bg-gray-100" onclick={() => (isExpanded = !isExpanded)}>
        {#if selectedItem?.icon}
            <selectedItem.icon />
        {/if}
        {#if isTitleImageOnly}
            <p class="capitalize">{selectedItem?.label}</p>
        {/if}
        <div class="dark:text-primary-500 transform transition-transform duration-300" class:rotate-180={isExpanded}>
            <ChevronDown />
        </div>
    </Button>

    {#if isExpanded}
        <div class="max-h-72 overflow-y-auto absolute bg-white dark:bg-gray-800 shadow-md rounded-lg z-50 w-32 p-2 right-0" bind:this={popoverRef}>
            {#each items as item}
                <Button aria-disabled={item.disabled} class="w-full border-none !px-1 flex justify-start bg-gray-100" variant="outline" onclick={() => handleClick(item)}>
                    {#if item.icon}
                        <item.icon />
                    {/if}
                    <p class="capitalize">{item.label}</p>
                </Button>
            {/each}
        </div>
    {/if}
</div>
