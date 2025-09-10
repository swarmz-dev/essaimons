<script lang="ts">
    import type { ComponentProps } from 'svelte';
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';

    let { checked = false, onCheckedChange, ...restProps }: ComponentProps<typeof Checkbox> = $props();
</script>

<Checkbox bind:checked {onCheckedChange} {...restProps} />
