<script lang="ts">
    import SmallCard from '#components/SmallCard.svelte';
    import { m } from '#lib/paraglide/messages';
    import { Title } from '#lib/components/ui/title';
    import Meta from '#components/Meta.svelte';
    import { Users, Ban, Handshake } from '@lucide/svelte';
    import type { Component } from 'svelte';

    interface Page {
        title: string;
        icon: Component;
        href: string;
        description: string;
    }

    const pages: Page[] = [
        {
            title: m['social.friends.title'](),
            icon: Handshake,
            href: '/social/friends',
            description: m['social.friends.description'](),
        },
        {
            title: m['social.blocked.title'](),
            icon: Ban,
            href: '/social/blocked',
            description: m['social.blocked.description'](),
        },
        {
            title: m['profile.title'](),
            icon: Users,
            href: '/profile',
            description: m['profile.description'](),
        },
    ];
</script>

<Meta title={m['social.meta.title']()} description={m['social.meta.description']()} keywords={m['social.meta.keywords']().split(', ')} pathname="/social" />

<Title title={m['social.title']()} />

<div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 p-5">
    {#each pages as page}
        <SmallCard title={page.title} icon={page.icon} href={page.href} description={page.description} />
    {/each}
</div>
