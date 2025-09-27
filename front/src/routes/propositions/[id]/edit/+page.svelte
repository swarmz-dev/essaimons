<script lang="ts">
    import PropositionForm from '#lib/partials/proposition/PropositionForm.svelte';
    import type { SerializedProposition, SerializedPropositionBootstrap } from 'backend/types';

    export let data: { bootstrap: SerializedPropositionBootstrap; proposition: SerializedProposition };
</script>

<PropositionForm bootstrap={data.bootstrap} initialProposition={data.proposition} mode="edit" />
