<script lang="ts" module>
    import type { Snippet } from 'svelte';

    export type FooterGroupProps = {
        children: Snippet;
        title: string;
        class: string;
    };
</script>

<script lang="ts">
    import { Separator } from '#lib/components/ui/separator';
    import { cn } from '#lib/utils';

    let { children, title, class: className }: FooterGroupProps = $props();
</script>

<div class={cn('flex flex-col gap-4 text-left', className)}>
    <h3 class="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">{title}</h3>
    <Separator class="w-12 border border-muted-foreground/30" />
    <ul class="flex flex-col gap-2">
        {@render children()}
    </ul>
</div>
