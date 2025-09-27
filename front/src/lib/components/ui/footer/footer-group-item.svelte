<script lang="ts" module>
    import type { Component } from 'svelte';

    export type FooterGroupItemProps = {
        name: string;
        href: string;
        icon: Component;
        target?: '_self' | '_blank';
        rel?: string;
    };
</script>

<script lang="ts">
    import { Link } from '#lib/components/ui/link';

    let { name, href, icon: Icon, target = '_self', rel }: FooterGroupItemProps = $props();
</script>

<li>
    <Link
        {href}
        {target}
        {rel}
        class="group flex items-center gap-3 rounded-2xl border border-transparent bg-white/20 px-3 py-2 text-sm font-medium !text-foreground/80 transition hover:border-primary/60 hover:bg-white/35 hover:!text-primary dark:bg-slate-900/40 dark:hover:bg-slate-900/55"
    >
        <span class="grid size-8 place-items-center rounded-full bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon class="size-4" />
        </span>
        <span class="flex-1 truncate">{name}</span>
    </Link>
</li>
