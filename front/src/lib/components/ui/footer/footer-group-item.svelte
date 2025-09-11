<script lang="ts" module>
    import type { Component } from 'svelte';

    export type FooterGroupItemProps = {
        name: string;
        href: string;
        icon: Component;
    };
</script>

<script lang="ts">
    import { Link } from '#lib/components/ui/link';

    let { name, href, icon: Icon }: FooterGroupItemProps = $props();
</script>

<Link {href}>
    <li class="flex gap-1 justify-start items-center">
        <Icon />
        <p>{name}</p>
    </li>
</Link>
