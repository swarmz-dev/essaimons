<script lang="ts">
    import type { WithElementRef } from '#lib/utils.js';
    import type { HTMLAttributes } from 'svelte/elements';
    import { BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '#lib/components/ui/breadcrumb';
    import { Link } from '#lib/components/ui/link';

    interface Item {
        title: string;
        href?: string;
    }

    let { items, class: className }: WithElementRef<HTMLAttributes<HTMLElement>> & { items: Item[] } = $props();
</script>

<nav data-slot="breadcrumb" class={className} aria-label="breadcrumb">
    <BreadcrumbList>
        {#each items as item, index}
            <BreadcrumbItem>
                {#if item.href}
                    <Link class="!p-0" href={item.href}>{item.title}</Link>
                {:else}
                    <BreadcrumbPage>{item.title}</BreadcrumbPage>
                {/if}
            </BreadcrumbItem>
            {#if index < items.length - 1}
                <BreadcrumbSeparator />
            {/if}
        {/each}
    </BreadcrumbList>
</nav>
