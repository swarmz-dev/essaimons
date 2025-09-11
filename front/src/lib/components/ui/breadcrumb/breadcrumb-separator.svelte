<script lang="ts">
    import { ChevronRightIcon } from '@lucide/svelte';
    import { type WithElementRef } from '#lib/utils.js';
    import type { HTMLLiAttributes } from 'svelte/elements';

    let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li bind:this={ref} data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" class={className} {...restProps}>
    {#if children}
        {@render children?.()}
    {:else}
        <ChevronRightIcon class="size-4" />
    {/if}
</li>
