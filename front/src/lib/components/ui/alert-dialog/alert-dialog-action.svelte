<script lang="ts">
    import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
    import { buttonVariants } from '#lib/components/ui/button';
    import { cn } from '#lib/utils';
    import Icon from '#components/Icon.svelte';

    let { ref = $bindable(null), class: className, loading = false, loadingLabel, children, ...restProps }: AlertDialogPrimitive.ActionProps & { loading?: boolean; loadingLabel?: string } = $props();
</script>

<AlertDialogPrimitive.Action
    bind:ref
    data-slot="alert-dialog-action"
    class={cn(buttonVariants(), className)}
    disabled={loading || restProps.disabled}
    aria-busy={loading}
    data-loading={loading ? 'true' : undefined}
    {...restProps}
>
    {#if loading}
        <span class="flex items-center gap-2">
            <Icon name="spinner" size={24} />
            {#if loadingLabel}
                <span class="font-medium">{loadingLabel}</span>
            {/if}
        </span>
    {:else}
        {@render children?.()}
    {/if}
</AlertDialogPrimitive.Action>
