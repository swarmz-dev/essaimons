<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import { Check } from '@lucide/svelte';

    type Props = SelectPrimitive.ItemProps;

    let { value, label, disabled, class: className, ...restProps }: Props = $props();
</script>

<SelectPrimitive.Item
    {value}
    {disabled}
    {label}
    class={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50',
        className
    )}
    {...restProps}
>
    <slot />
    <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center data-[selected]:block hidden">
        <Check class="h-4 w-4" />
    </span>
</SelectPrimitive.Item>
