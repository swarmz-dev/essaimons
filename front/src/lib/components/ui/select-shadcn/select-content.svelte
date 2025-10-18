<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';

    type Props = SelectPrimitive.ContentProps & {
        class?: string;
    };

    let { sideOffset = 4, class: className, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Content
    {sideOffset}
    class={cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none', className)}
    {...restProps}
>
    <div class="w-full p-1">
        <slot />
    </div>
</SelectPrimitive.Content>
