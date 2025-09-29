<script lang="ts">
    import Tabs, { type TabItem } from './Tabs.svelte';

    export let items: TabItem[] = [];
    export let value: string;

    let selected = value;

    const handleChange = (event: CustomEvent<string>) => {
        selected = event.detail;
    };
</script>

<Tabs {items} value={selected} ariaLabel="Test tabs" on:change={handleChange} />
