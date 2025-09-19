<script lang="ts">
    import { Link } from '#lib/components/ui/link';
    import { m } from '#lib/paraglide/messages';
    import type { Component } from 'svelte';

    type Props = {
        title: string;
        icon: Component;
        href: string;
        description: string;
    };

    let { title, icon: Icon, href, description }: Props = $props();
</script>

<Link
    {href}
    class="group relative overflow-hidden rounded-3xl border border-white/40 bg-white/75 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-white/85 dark:border-slate-800/80 dark:bg-slate-900/70"
>
    <span aria-hidden="true" class="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-primary/20 opacity-0 blur-3xl transition group-hover:opacity-100"></span>
    <div class="flex flex-col gap-6">
        <div class="flex items-start justify-between gap-6">
            <div class="space-y-2">
                <p class="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</p>
                {#if description}
                    <p class="text-base text-muted-foreground transition-opacity duration-300 group-hover:text-foreground/85 md:max-w-md">
                        {description}
                    </p>
                {/if}
            </div>
            <span class="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-inner transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon class="size-7" />
            </span>
        </div>
        <span class="inline-flex items-center gap-2 text-sm font-semibold text-primary transition group-hover:translate-x-1">
            {m['common.continue']()}
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
            </svg>
        </span>
    </div>
</Link>
