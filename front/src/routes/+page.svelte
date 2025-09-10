<script lang="ts">
    import SmallCard from '#components/SmallCard.svelte';
    import { m } from '#lib/paraglide/messages';
    import { Title } from '#lib/components/ui/title';
    import Meta from '#components/Meta.svelte';
    import { Handshake } from '@lucide/svelte';
    import type { Component } from 'svelte';

    interface Page {
        title: string;
        icon: Component;
        href: string;
        description: string;
    }

    const pages: Page[] = [
        {
            title: m['social.title'](),
            icon: Handshake,
            href: '/social',
            description: m['social.description'](),
        },
    ];
</script>

<Meta title={m['home.meta.title']()} description={m['home.meta.description']()} keywords={m['home.meta.keywords']().split(', ')} pathname="/" />

<Title title={m['home.title']()} />

<div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 p-5">
    {#each pages as page}
        <SmallCard title={page.title} icon={page.icon} href={page.href} description={page.description} />
    {/each}
</div>
