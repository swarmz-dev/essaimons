<script lang="ts">
    import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarTrigger, useSidebar } from '#lib/components/ui/sidebar';
    import { adminMenu, mainMenu, type MenuItemsListItem } from '#lib/services/menuService';
    import { profile } from '#lib/stores/profileStore';
    import Theme from '#components/Theme.svelte';
    import FlagMenu from '#lib/partials/menu/FlagMenu.svelte';
    import FloatingSidebarToggle from '#lib/partials/menu/FloatingSidebarToggle.svelte';
    import { Link } from '#lib/components/ui/link';
    import { page } from '$app/state';
    import { cn } from '#lib/utils';
    import { m } from '#lib/paraglide/messages';
    import type { Snippet } from 'svelte';
    import { organizationSettings, translateField } from '#lib/stores/organizationStore';
    import { language } from '#lib/stores/languageStore';
    import { Button } from '#lib/components/ui/button';
    import { ArrowLeft } from '@lucide/svelte';

    type Props = {
        children: Snippet;
    };

    let { children }: Props = $props();

    let triggerButtonRef: HTMLButtonElement | undefined = $state();
    let isOpen: boolean = $state(true);

    const DEFAULT_BRAND_NAME = 'Essaimons-V1';
    let navItems: MenuItemsListItem[] = $state(mainMenu.notConnected);
    const resolvedLocale = $derived($language);
    const fallbackLocale = $derived($organizationSettings.fallbackLocale);
    const brandName = $derived(translateField($organizationSettings.name, resolvedLocale, fallbackLocale) ?? DEFAULT_BRAND_NAME);
    const logoUrl = $derived($organizationSettings.logo ? `/assets/organization/logo/${$organizationSettings.logo.id}?no-cache=true` : null);

    $effect(() => {
        if (!$profile) {
            navItems = mainMenu.notConnected;
            return;
        }

        const isAdminView = $profile.role === 'admin' && page.data.isAdmin;
        const items = isAdminView ? adminMenu : mainMenu.connected;

        navItems = $profile.role === 'admin' ? items : items.filter((item) => !item.href.startsWith('/admin'));
    });

    const currentPath = $derived(page.url.pathname);
    const currentLocation = $derived<string>(page.data.location ?? currentPath);

    const matchesLocation = (href: string, location: string): boolean => {
        if (href === '/') {
            return location === '/';
        }

        return location === href || location.startsWith(`${href}/`);
    };

    const isNavItemActive = (href: string): boolean => {
        if (!currentLocation) {
            return false;
        }

        let bestMatch: string | null = null;

        for (const item of navItems) {
            if (!matchesLocation(item.href, currentLocation)) {
                continue;
            }

            if (!bestMatch || item.href.length > bestMatch.length) {
                bestMatch = item.href;
            }
        }

        return bestMatch === href;
    };
</script>

<SidebarProvider bind:open={isOpen}>
    {@const sidebar = useSidebar()}
    <Sidebar toggleButtonRef={triggerButtonRef} variant="floating" class="bg-sidebar/85 ring-1 ring-inset ring-sidebar-border/60 backdrop-blur-2xl shadow-2xl">
        <SidebarContent class="flex h-full flex-col gap-4 px-4 py-5">
            <SidebarGroup>
                <SidebarGroupContent class="space-y-6">
                    <div class="flex items-center justify-between gap-3 px-1">
                        <Link href="/" class="flex items-center gap-3 text-left text-base font-semibold !h-auto !w-auto !rounded-none !border-0 !bg-transparent !p-0 !shadow-none !text-foreground/90">
                            <span class="grid size-10 place-items-center overflow-hidden rounded-xl">
                                {#if logoUrl}
                                    <img src={logoUrl} alt="" class="size-9 rounded-xl object-cover" />
                                {:else}
                                    <img src="/icons/favicon-96x96.png" alt="" class="size-9 rounded-xl object-cover" />
                                {/if}
                            </span>
                            <span class="truncate">{brandName}</span>
                        </Link>
                        <Button
                            bind:ref={triggerButtonRef}
                            size="icon"
                            variant="ghost"
                            class="flex size-10 items-center justify-center rounded-full text-foreground transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                            onclick={() => {
                                sidebar.ignoreNextOutsideClick();
                                sidebar.toggle();
                            }}
                        >
                            <ArrowLeft class="size-5" />
                            <span class="sr-only">{m['common.close']()}</span>
                        </Button>
                    </div>

                    <SidebarMenu class="space-y-1.5">
                        {#each navItems as item (item.title)}
                            <SidebarMenuItem>
                                <Link
                                    href={item.href}
                                    class={cn(
                                        'group/nav flex w-full items-center justify-start gap-3 rounded-2xl border border-transparent px-4 py-3 text-base font-semibold tracking-tight transition-all duration-200',
                                        'bg-white/65 text-foreground/80 shadow-sm outline-none backdrop-blur-lg dark:bg-slate-950/60 dark:text-slate-200',
                                        isNavItemActive(item.href)
                                            ? 'border-primary/70 bg-primary text-primary-foreground shadow-xl ring-1 ring-primary/50'
                                            : 'hover:border-primary/60 hover:bg-white/85 hover:text-primary dark:hover:bg-slate-900/70'
                                    )}
                                >
                                    <span
                                        class={cn(
                                            'grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary transition-all duration-200 group-hover/nav:bg-primary group-hover/nav:text-primary-foreground',
                                            isNavItemActive(item.href) ? 'bg-primary text-primary-foreground shadow-inner' : ''
                                        )}
                                    >
                                        <item.icon class="size-5" />
                                    </span>
                                    <span class="truncate">{item.title}</span>
                                </Link>
                            </SidebarMenuItem>
                        {/each}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>

    <SidebarInset>
        <div class="flex min-h-screen flex-col gap-10 pb-10">
            <div class="sticky top-6 z-20 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between gap-4 rounded-full border border-sidebar-border/50 bg-white/85 px-4 py-3 shadow-xl backdrop-blur-2xl dark:bg-slate-950/80">
                    <div class="flex flex-1 items-center gap-3">
                        {#if !isOpen}
                            <SidebarTrigger
                                class="inline-flex size-11 items-center justify-center rounded-full border border-transparent bg-white/90 text-foreground shadow-md transition hover:border-primary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-900"
                            />
                        {/if}

                        {#if $profile}
                            <div class="hidden items-center gap-3 rounded-full border border-transparent bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md md:flex dark:bg-slate-900/70">
                                <span class="grid size-10 place-items-center rounded-full bg-primary/15 text-base font-semibold text-primary shadow-inner">
                                    {($profile.username ?? brandName).slice(0, 1).toUpperCase()}
                                </span>
                                <div class="flex flex-col leading-tight">
                                    <span class="text-sm font-semibold text-foreground/85">{$profile.username}</span>
                                </div>
                            </div>
                        {:else if !currentLocation.startsWith('/login')}
                            <Link
                                href="/login"
                                class="hidden items-center gap-2 rounded-full border border-sidebar-border/60 bg-white/80 px-4 py-2 text-sm font-semibold !text-foreground/80 shadow-sm transition hover:border-primary/60 hover:!text-primary md:inline-flex dark:bg-slate-900/70"
                            >
                                {m['login.title']()}
                            </Link>
                        {/if}
                    </div>
                    <div class="flex items-center gap-2">
                        <FlagMenu />
                        <Theme />
                    </div>
                </div>
            </div>

            {@render children()}
        </div>
    </SidebarInset>

    <FloatingSidebarToggle />
</SidebarProvider>
