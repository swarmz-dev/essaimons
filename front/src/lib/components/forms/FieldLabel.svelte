<script lang="ts">
    import { cn } from '#lib/utils';
    import type { Snippet } from 'svelte';

    type Props = {
        forId?: string;
        label: string;
        required?: boolean;
        info?: string;
        class?: string;
        children?: Snippet;
    };

    let { forId, label, required = false, info, class: className, children }: Props = $props();
</script>

<div class={cn('flex flex-col gap-2', className)}>
    <label for={forId} class="text-sm font-semibold text-foreground/90">
        {label}
        {#if required}
            <span class="text-red-600 font-medium">*</span>
        {/if}
    </label>
    {#if info}
        <p class="text-xs leading-snug text-muted-foreground">{info}</p>
    {/if}
    {@render children?.()}
</div>
