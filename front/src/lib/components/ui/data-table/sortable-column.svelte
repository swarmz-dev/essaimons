<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { ArrowUpDown } from '@lucide/svelte';

    type Props = {
        title: string;
        field: string;
        onclick: (field: string, order: 'asc' | 'desc') => void;
    };

    const { title, field, onclick }: Props = $props();

    let hovered: boolean = $state(false);
    let order: 'asc' | 'desc' = $state('asc');

    const handleSort = () => {
        order = order === 'asc' ? 'desc' : 'asc';
        onclick(field, order);
    };
</script>

<Button
    variant={hovered ? 'outline' : 'ghost'}
    onclick={handleSort}
    class="border border-transparent flex items-center gap-1"
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => (hovered = false)}
>
    <p>{title}</p>
    <ArrowUpDown class="size-4" />
</Button>
