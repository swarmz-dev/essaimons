<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import type { ComponentProps } from 'svelte';
    import { useSidebar } from './context.svelte';
    import { Menu } from '@lucide/svelte';

    let {
        ref = $bindable(),
        class: className,
        onclick,
        ...restProps
    }: ComponentProps<typeof Button> & {
        onclick?: (e: MouseEvent) => void;
    } = $props();

    const sidebar = useSidebar();

    const handleClick = (event: MouseEvent) => {
        sidebar.ignoreNextOutsideClick();
        sidebar.toggle();
        onclick?.(event);
    };
</script>

<Button bind:ref data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon" class={className} type="button" onclick={handleClick} {...restProps}>
    <Menu class="size-8" />
    <span class="sr-only">Toggle Sidebar</span>
</Button>
