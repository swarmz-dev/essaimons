<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import { flyAndScale } from '$lib/utils.js';

    type $$Props = SelectPrimitive.ContentProps;
    type $$Events = SelectPrimitive.ContentEvents;

    let className: $$Props['class'] = undefined;
    export let sideOffset: $$Props['sideOffset'] = 4;
    export let transition: $$Props['transition'] = flyAndScale;
    export let transitionConfig: $$Props['transitionConfig'] = undefined;
    export { className as class };
</script>

<SelectPrimitive.Content
    {transition}
    {transitionConfig}
    {sideOffset}
    class={cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none', className)}
    {...$$restProps}
    on:keydown
>
    <div class="w-full p-1">
        <slot />
    </div>
</SelectPrimitive.Content>
