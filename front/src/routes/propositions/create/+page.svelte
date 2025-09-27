<script lang="ts">
    import PropositionForm from '#lib/partials/proposition/PropositionForm.svelte';
    import type { SerializedPropositionBootstrap } from 'backend/types';

    export let data: SerializedPropositionBootstrap;
</script>

<PropositionForm bootstrap={data} />
