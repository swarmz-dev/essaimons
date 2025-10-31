<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { PUBLIC_GITHUB_REPOSITORY } from '$env/static/public';
    import { Github } from '@lucide/svelte';
    import { FooterGroupItem, FooterGroup } from '#lib/components/ui/footer';
    import { Link } from '#lib/components/ui/link';
    import { organizationSettings, translateField } from '#lib/stores/organizationStore';
    import { language } from '#lib/stores/languageStore';

    const DEFAULT_BRAND_NAME = 'Essaimons-V1';
    const DEFAULT_DESCRIPTION = m['home.meta.description']();
    const DEFAULT_COPYRIGHT = 'Copyleft 2025 La Ruche, AGPL-3.0';
    const resolvedLocale = $derived($language);
    const fallbackLocale = $derived($organizationSettings.fallbackLocale);
    const brandName = $derived(translateField($organizationSettings.name, resolvedLocale, fallbackLocale) ?? DEFAULT_BRAND_NAME);
    const description = $derived(translateField($organizationSettings.description, resolvedLocale, fallbackLocale) ?? DEFAULT_DESCRIPTION);
    const sourceCodeUrl = $derived(translateField($organizationSettings.sourceCodeUrl, resolvedLocale, fallbackLocale) ?? PUBLIC_GITHUB_REPOSITORY);
    const hasSourceLink = $derived(Boolean(sourceCodeUrl));
    const logoUrl = $derived($organizationSettings.logo ? `/assets/organization/logo/${$organizationSettings.logo.id}?no-cache=true` : null);
    const copyrightText = $derived(translateField($organizationSettings.copyright, resolvedLocale, fallbackLocale) ?? DEFAULT_COPYRIGHT);
</script>

<footer class="relative mt-16 w-full">
    <div class="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/45 bg-white/85 px-6 py-12 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <span class="pointer-events-none absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px] dark:bg-primary/30"></span>
        <span class="pointer-events-none absolute bottom-[-35%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[150px] dark:bg-accent/30"></span>

        <div class="grid gap-12 lg:grid-cols-[1.45fr_1fr]">
            <div class="space-y-6">
                <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-4">
                        <span class="grid size-16 place-items-center rounded-3xl bg-primary/15 text-primary shadow-inner overflow-hidden">
                            {#if logoUrl}
                                <img src={logoUrl} alt={brandName} class="size-12 rounded-2xl object-cover" />
                            {/if}
                        </span>
                        <div class="flex flex-col leading-tight">
                            <span class="text-2xl font-semibold text-foreground">{brandName}</span>
                        </div>
                    </div>
                </div>
                <div class="max-w-2xl text-base text-muted-foreground/90 prose prose-sm dark:prose-invert prose-a:text-primary hover:prose-a:text-primary/80">
                    {@html description}
                </div>
            </div>

            <div class="space-y-3">
                <FooterGroup title={m['footer.about']()} class="text-left">
                    {#if hasSourceLink}
                        <FooterGroupItem name={m['menu.source-code']()} href={sourceCodeUrl} icon={Github} target="_blank" rel="noopener" />
                    {/if}
                    <li class="text-sm leading-6 text-muted-foreground/80">
                        {brandName}
                    </li>
                </FooterGroup>
            </div>
        </div>

        <div class="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/25 pt-6 text-xs text-muted-foreground sm:flex-row dark:border-slate-800/60">
            <p>{copyrightText}</p>
            <Link href="/" class="inline-flex items-center gap-2 text-xs font-semibold !text-foreground/70 transition hover:!text-primary">
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                {m['common.back-to-home']()}
            </Link>
        </div>
    </div>
</footer>
