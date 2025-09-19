<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements';
    import { cn, type WithElementRef } from '#lib/utils';

    let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
    bind:this={ref}
    data-slot="card"
    class={cn(
        'text-card-foreground flex flex-col gap-6 rounded-3xl border border-white/45 bg-white/85 py-8 shadow-xl backdrop-blur-2xl transition-colors dark:border-slate-800/80 dark:bg-slate-950/75',
        className
    )}
    {...restProps}
>
    {@render children?.()}
</div>
