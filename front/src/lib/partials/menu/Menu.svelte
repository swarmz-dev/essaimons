<script lang="ts">
    import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarInset, SidebarTrigger } from '#lib/components/ui/sidebar';
    import { adminMenu, mainMenu } from '#lib/services/menuService';
    import { profile } from '#lib/stores/profileStore';
    import Theme from '#components/Theme.svelte';
    import FlagMenu from '#lib/partials/menu/FlagMenu.svelte';
    import { Link } from '#lib/components/ui/link';
    import { page } from '$app/state';
    import type { Snippet } from 'svelte';

    type Props = {
        children: Snippet;
    };

    let { children }: Props = $props();

    let triggerButtonRef: HTMLButtonElement | undefined = $state();
    let isOpen: boolean = $state(false);
</script>

<SidebarProvider bind:open={isOpen}>
    <Sidebar toggleButtonRef={triggerButtonRef}>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <div class="flex items-center gap-5 mt-1">
                            <SidebarTrigger bind:ref={triggerButtonRef} />
                            <FlagMenu />
                            <Theme />
                        </div>
                        <div class="flex flex-col gap-5 mt-3">
                            {#if $profile}
                                {#if $profile.role === 'admin' && page.data.isAdmin}
                                    {#each adminMenu as item (item.title)}
                                        {#if !item.href.startsWith('/admin') || $profile.role === 'admin'}
                                            <SidebarMenuItem>
                                                <Link href={item.href} class="flex justify-start items-center gap-3">
                                                    <item.icon class="size-6" />
                                                    <p class="text-2xl">{item.title}</p>
                                                </Link>
                                            </SidebarMenuItem>
                                        {/if}
                                    {/each}
                                {:else}
                                    {#each mainMenu.connected as item (item.title)}
                                        {#if !item.href.startsWith('/admin') || $profile.role === 'admin'}
                                            <SidebarMenuItem>
                                                <Link href={item.href} class="flex justify-start items-center gap-3">
                                                    <item.icon class="size-6" />
                                                    <p class="text-2xl">{item.title}</p>
                                                </Link>
                                            </SidebarMenuItem>
                                        {/if}
                                    {/each}
                                {/if}
                            {:else}
                                {#each mainMenu.notConnected as item (item.title)}
                                    <SidebarMenuItem>
                                        <Link href={item.href} class="flex justify-start items-center gap-3">
                                            <item.icon class="size-6" />
                                            <p class="text-2xl">{item.title}</p>
                                        </Link>
                                    </SidebarMenuItem>
                                {/each}
                            {/if}
                        </div>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>

    <SidebarInset>
        <div class="mt-3">
            <div class="h-10">
                <SidebarTrigger class={`${isOpen ? 'hidden' : ''}`} />
            </div>
            {@render children()}
        </div>
    </SidebarInset>
</SidebarProvider>
