<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';
    import { cn, type WithElementRef } from '#lib/utils';

    let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} data-slot="card" class={cn('bg-gray-300 dark:bg-gray-700 text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', className)} {...restProps}>
    {@render children?.()}
</div>
