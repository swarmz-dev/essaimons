<script lang="ts">
    import { cn, type WithElementRef } from '#lib/utils.js';
    import type { HTMLAttributes } from 'svelte/elements';

    let { ref = $bindable(null), class: className, children, onclick, ...restProps }: WithElementRef<HTMLAttributes<HTMLTableRowElement>> & { onclick?: () => void } = $props();
</script>

<tr bind:this={ref} data-slot="table-row" class={cn('data-[state=selected]:bg-muted border-b transition-colors', className)} {onclick} {...restProps}>
    {@render children?.()}
</tr>
