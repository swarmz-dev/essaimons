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

<div class={cn('p-1 flex flex-col gap-3 mt-3 items-center', className)}>
    <h3 class="uppercase font-bold">{title}</h3>
    <Separator />
    <ul class="flex flex-col gap-1">
        {@render children()}
    </ul>
</div>
