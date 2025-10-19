<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { m } from '#lib/paraglide/messages';
    import { propositionImportExportStore } from '#lib/stores/propositionImportExportStore.svelte';
    import { goto } from '$app/navigation';

    const store = propositionImportExportStore;
    const result = $derived(store.result);

    const viewPropositions = () => {
        goto('/propositions');
    };

    const startNewImport = () => {
        store.reset();
    };
</script>

<Card>
    <CardHeader>
        <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <CardTitle>{m['admin.propositions.import.complete.title']()}</CardTitle>
                <CardDescription>{m['admin.propositions.import.complete.description']()}</CardDescription>
            </div>
        </div>
    </CardHeader>
    <CardContent class="space-y-6">
        {#if result}
            <!-- Summary -->
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div class="rounded-lg bg-green-50 dark:bg-green-950 p-4">
                    <p class="text-sm text-green-700 dark:text-green-300">
                        {m['admin.propositions.import.complete.created']()}
                    </p>
                    <p class="text-2xl font-bold text-green-700 dark:text-green-300">
                        {result.summary.propositionsCreated}
                    </p>
                </div>
                <div class="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                        {m['admin.propositions.import.complete.merged']()}
                    </p>
                    <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {result.summary.propositionsMerged}
                    </p>
                </div>
                <div class="rounded-lg bg-gray-50 dark:bg-gray-950 p-4">
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        {m['admin.propositions.import.complete.skipped']()}
                    </p>
                    <p class="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {result.summary.propositionsSkipped}
                    </p>
                </div>
            </div>

            <!-- Additional Stats -->
            <div class="rounded-lg bg-muted p-4">
                <h4 class="font-medium mb-4">{m['admin.propositions.import.complete.additional']()}</h4>
                <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <div class="flex justify-between">
                        <span>{m['admin.propositions.import.complete.users_created']()}</span>
                        <span class="font-medium">{result.summary.usersCreated}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{m['admin.propositions.import.complete.categories_created']()}</span>
                        <span class="font-medium">{result.summary.categoriesCreated}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>{m['admin.propositions.import.complete.files_uploaded']()}</span>
                        <span class="font-medium">{result.summary.filesUploaded}</span>
                    </div>
                </div>
            </div>

            <!-- Details -->
            {#if result.details && result.details.length > 0}
                <div>
                    <h4 class="font-medium mb-3">{m['admin.propositions.import.complete.details']()}</h4>
                    <div class="max-h-96 overflow-y-auto space-y-2 rounded-lg border p-4">
                        {#each result.details as detail}
                            <div class="flex items-center gap-2 text-sm">
                                {#if detail.action === 'CREATED'}
                                    <span class="h-2 w-2 rounded-full bg-green-500"></span>
                                    <span class="font-medium text-green-700 dark:text-green-400">{m['admin.propositions.import.complete.action.created']()}</span>
                                {:else if detail.action === 'MERGED'}
                                    <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                                    <span class="font-medium text-blue-700 dark:text-blue-400">{m['admin.propositions.import.complete.action.merged']()}</span>
                                {:else if detail.action === 'SKIPPED'}
                                    <span class="h-2 w-2 rounded-full bg-gray-500"></span>
                                    <span class="font-medium text-gray-700 dark:text-gray-400">{m['admin.propositions.import.complete.action.skipped']()}</span>
                                {:else}
                                    <span class="h-2 w-2 rounded-full bg-red-500"></span>
                                    <span class="font-medium text-red-700 dark:text-red-400">{m['admin.propositions.import.complete.action.failed']()}</span>
                                {/if}
                                <span class="flex-1 truncate text-muted-foreground">{detail.sourceId}</span>
                                {#if detail.targetId}
                                    <a href="/propositions/{detail.targetId}" class="text-primary hover:underline">
                                        {m['common.view']()}
                                    </a>
                                {/if}
                            </div>
                            {#if detail.warnings && detail.warnings.length > 0}
                                <div class="ml-6 text-xs text-yellow-600 dark:text-yellow-400">
                                    {detail.warnings.join(', ')}
                                </div>
                            {/if}
                            {#if detail.error}
                                <div class="ml-6 text-xs text-red-600 dark:text-red-400">
                                    {detail.error}
                                </div>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Errors -->
            {#if result.errors && result.errors.length > 0}
                <div class="rounded-lg bg-red-50 dark:bg-red-950 p-4">
                    <h4 class="font-medium text-red-700 dark:text-red-300 mb-2">
                        {m['admin.propositions.import.complete.errors']()}
                    </h4>
                    <ul class="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                        {#each result.errors as error}
                            <li>{error}</li>
                        {/each}
                    </ul>
                </div>
            {/if}
        {/if}

        <!-- Actions -->
        <div class="flex justify-between">
            <Button variant="outline" onclick={startNewImport}>
                {m['admin.propositions.import.complete.new_import']()}
            </Button>
            <Button onclick={viewPropositions}>
                {m['admin.propositions.import.complete.view_propositions']()}
            </Button>
        </div>
    </CardContent>
</Card>
