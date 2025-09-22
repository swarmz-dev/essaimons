<script lang="ts">
    import { SidebarTrigger } from '#lib/components/ui/sidebar';
    import { useSidebar } from '#lib/components/ui/sidebar/context.svelte';
    import { m } from '#lib/paraglide/messages';

    const sidebar = useSidebar();

    $: isCollapsed = (!sidebar.isMobile && !sidebar.open) || (sidebar.isMobile && !sidebar.openMobile);
</script>

{#if isCollapsed}
    <SidebarTrigger
        class="fixed z-50 bottom-6 left-6 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/30"
        aria-label={m['menu.open']()}
    />
{/if}
