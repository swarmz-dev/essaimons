<script lang="ts">
    import { ArrowLeft } from '@lucide/svelte';
    import { Link } from '#lib/components/ui/link';
    import type { Snippet } from 'svelte';

    type Props = {
        children: Snippet;
        href: string;
    };

    let { children, href }: Props = $props();
</script>

<Link {href} class="flex items-center">
    <ArrowLeft class="mb-0.5" />
    {@render children?.()}
</Link>
