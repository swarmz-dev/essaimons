<script lang="ts">
    import { profile } from '#lib/stores/profileStore';
    import { m } from '#lib/paraglide/messages';
    import { PUBLIC_GITHUB_REPOSITORY } from '$env/static/public';
    import { Github } from '@lucide/svelte';
    import { mainMenu, type MenuItemsListItem } from '#lib/services/menuService';
    import { FooterGroupItem, FooterGroup } from '#lib/components/ui/footer';
    import { Link } from '#lib/components/ui/link';

    const brandName = 'Essaimons-V1';
    let footerNavigation: MenuItemsListItem[] = $state(mainMenu.notConnected);

    $effect(() => {
        if (!$profile) {
            footerNavigation = mainMenu.notConnected;
            return;
        }

        footerNavigation = mainMenu.connected.filter((item) => $profile.role === 'admin' || !item.href.startsWith('/admin'));
    });
</script>

<footer class="relative mt-16 w-full">
    <div class="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/45 bg-white/85 px-6 py-12 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <span class="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px] dark:bg-primary/30"></span>
        <span class="pointer-events-none absolute bottom-[-35%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[150px] dark:bg-accent/30"></span>

        <div class="grid gap-12 lg:grid-cols-[1.45fr_1fr]">
            <div class="space-y-6">
                <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-4">
                        <span class="grid size-16 place-items-center rounded-3xl bg-primary/15 text-primary shadow-inner">
                            <img src="/icons/favicon-96x96.png" alt={m['common.logo.alt']()} class="size-12 rounded-2xl" />
                        </span>
                        <div class="flex flex-col leading-tight">
                            <span class="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">{m['common.logo.alt']()}</span>
                            <span class="text-2xl font-semibold text-foreground">{brandName}</span>
                        </div>
                    </div>
                    <Link
                        href={PUBLIC_GITHUB_REPOSITORY}
                        target="_blank"
                        class="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-semibold !text-primary transition hover:bg-primary hover:!text-primary-foreground"
                    >
                        <Github class="size-4" />
                        {m['menu.source-code']()}
                    </Link>
                </div>
                <p class="max-w-2xl text-base text-muted-foreground/90">
                    {m['home.meta.description']()}
                </p>
            </div>

            <div class="grid gap-8 sm:grid-cols-2">
                <FooterGroup title={m['footer.navigation']()} class="text-left">
                    {#each footerNavigation as item (item.title)}
                        <FooterGroupItem name={item.title} href={item.href} icon={item.icon} />
                    {/each}
                </FooterGroup>
                <FooterGroup title={m['footer.about']()} class="text-left">
                    <FooterGroupItem name={m['menu.source-code']()} href={PUBLIC_GITHUB_REPOSITORY} icon={Github} target="_blank" />
                    <li class="text-sm leading-6 text-muted-foreground/80">
                        {m['home.meta.title']()}
                    </li>
                </FooterGroup>
            </div>
        </div>

        <div class="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/25 pt-6 text-xs text-muted-foreground sm:flex-row dark:border-slate-800/60">
            <p>© 2025 Tassadraft Studio</p>
            <Link href="/" class="inline-flex items-center gap-2 text-xs font-semibold !text-foreground/70 transition hover:!text-primary">
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                {m['common.back-to-home']()}
            </Link>
        </div>
    </div>
</footer>
