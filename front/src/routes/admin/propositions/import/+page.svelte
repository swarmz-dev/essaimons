<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { propositionImportExportStore } from '#lib/stores/propositionImportExportStore.svelte';
    import ImportStepUpload from './ImportStepUpload.svelte';
    import ImportStepResolve from './ImportStepResolve.svelte';
    import ImportStepExecute from './ImportStepExecute.svelte';
    import ImportStepComplete from './ImportStepComplete.svelte';
    import { Card, CardContent } from '#lib/components/ui/card';

    const store = propositionImportExportStore;

    $effect(() => {
        // Reset store when component unmounts
        return () => {
            store.reset();
        };
    });
</script>

<Title title={m['admin.propositions.import.title']()} hasBackground />

<div class="mx-auto max-w-5xl space-y-6">
    <!-- Progress indicator -->
    <Card>
        <CardContent class="p-6">
            <div class="flex items-center justify-between">
                <div class="flex flex-1 items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full {store.step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">1</div>
                    <div class="flex-1 border-t-2 border-muted"></div>
                </div>
                <div class="flex flex-1 items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full {store.step === 'resolve' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">2</div>
                    <div class="flex-1 border-t-2 border-muted"></div>
                </div>
                <div class="flex flex-1 items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full {store.step === 'execute' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">3</div>
                    <div class="flex-1 border-t-2 border-muted"></div>
                </div>
                <div class="flex items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full {store.step === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">✓</div>
                </div>
            </div>
            <div class="mt-4 flex justify-between text-sm">
                <span class="font-medium">{m['admin.propositions.import.step.upload']()}</span>
                <span class="font-medium">{m['admin.propositions.import.step.resolve']()}</span>
                <span class="font-medium">{m['admin.propositions.import.step.execute']()}</span>
                <span class="font-medium">{m['admin.propositions.import.step.complete']()}</span>
            </div>
        </CardContent>
    </Card>

    <!-- Step content -->
    {#if store.step === 'upload'}
        <ImportStepUpload />
    {:else if store.step === 'resolve'}
        <ImportStepResolve />
    {:else if store.step === 'execute'}
        <ImportStepExecute />
    {:else if store.step === 'complete'}
        <ImportStepComplete />
    {/if}
</div>
