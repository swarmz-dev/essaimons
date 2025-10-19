<script lang="ts">
    import Tabs, { type TabItem } from './Tabs.svelte';

    type Props = {
        items: TabItem[];
        value: string;
    };

    let { items, value }: Props = $props();

    let selected = $state(value);

    const handleChange = (newValue: string) => {
        selected = newValue;
    };
</script>

<Tabs {items} bind:value={selected} ariaLabel="Test tabs" onchange={handleChange} />
