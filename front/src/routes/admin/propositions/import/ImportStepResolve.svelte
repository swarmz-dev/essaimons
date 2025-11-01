<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { m } from '#lib/paraglide/messages';
    import { propositionImportExportStore } from '#lib/stores/propositionImportExportStore.svelte';
    import { showToast } from '#lib/services/toastService';
    import ConflictItem from './ConflictItem.svelte';
    import type { ConflictResolution } from 'backend/types';
    import { PUBLIC_API_BASE_URI } from '$env/static/public';

    const store = propositionImportExportStore;

    const conflictReport = $derived(store.conflictReport);
    const configuration = $derived(store.configuration);
    const isLoading = $derived(store.isLoading);

    const errorConflicts = $derived(conflictReport?.conflicts.filter((c) => c.severity === 'ERROR') ?? []);
    const warningConflicts = $derived(conflictReport?.conflicts.filter((c) => c.severity === 'WARNING') ?? []);

    const canProceed = $derived(store.areAllCriticalConflictsResolved());

    const handleResolution = (conflictIndex: number, resolution: ConflictResolution) => {
        store.addResolution(resolution);
    };

    const proceedToExecution = async () => {
        if (!canProceed) {
            showToast(m['admin.propositions.import.resolve.error.unresolved'](), 'error');
            return;
        }

        if (!configuration) {
            showToast(m['admin.propositions.import.error.validation'](), 'error');
            return;
        }

        // Save the configuration on the server before proceeding
        store.setLoading(true);

        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('client_token='))
                ?.split('=')[1];

            const response = await fetch(`${PUBLIC_API_BASE_URI}/api/admin/propositions/import/configure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify(configuration),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save configuration');
            }

            store.setStep('execute');
        } catch (error) {
            showToast(String(error), 'error');
        } finally {
            store.setLoading(false);
        }
    };

    const goBack = () => {
        store.reset();
    };
</script>

<div class="space-y-6">
    <!-- Summary -->
    <Card>
        <CardHeader>
            <CardTitle>{m['admin.propositions.import.resolve.title']()}</CardTitle>
            <CardDescription>{m['admin.propositions.import.resolve.description']()}</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="rounded-lg bg-muted p-4">
                    <p class="text-sm text-muted-foreground">
                        {m['admin.propositions.import.resolve.total']()}
                    </p>
                    <p class="text-2xl font-bold">{conflictReport?.summary.totalPropositions ?? 0}</p>
                </div>
                <div class="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                    <p class="text-sm text-green-700 dark:text-green-300">
                        {m['admin.propositions.import.resolve.new']()}
                    </p>
                    <p class="text-2xl font-bold text-green-700 dark:text-green-300">
                        {conflictReport?.summary.newPropositions ?? 0}
                    </p>
                </div>
                <div class="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                    <p class="text-sm text-yellow-700 dark:text-yellow-300">
                        {m['admin.propositions.import.resolve.existing']()}
                    </p>
                    <p class="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {conflictReport?.summary.existingPropositions ?? 0}
                    </p>
                </div>
                <div class="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                    <p class="text-sm text-red-700 dark:text-red-300">
                        {m['admin.propositions.import.resolve.conflicts']()}
                    </p>
                    <p class="text-2xl font-bold text-red-700 dark:text-red-300">
                        {conflictReport?.summary.conflicts ?? 0}
                    </p>
                </div>
            </div>

            {#if conflictReport?.summary.conflicts === 0}
                <div class="mt-4 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-950 dark:text-green-300">
                    {m['admin.propositions.import.resolve.no_conflicts']()}
                </div>
            {/if}
        </CardContent>
    </Card>

    <!-- Error Conflicts -->
    {#if errorConflicts.length > 0}
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {errorConflicts.length}
                    </span>
                    {m['admin.propositions.import.resolve.errors']()}
                </CardTitle>
                <CardDescription>{m['admin.propositions.import.resolve.errors_desc']()}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                {#each errorConflicts as conflict, index}
                    {@const conflictIndex = conflictReport?.conflicts.indexOf(conflict) ?? 0}
                    <ConflictItem {conflict} {conflictIndex} onResolve={handleResolution} />
                {/each}
            </CardContent>
        </Card>
    {/if}

    <!-- Warning Conflicts -->
    {#if warningConflicts.length > 0}
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs text-white">
                        {warningConflicts.length}
                    </span>
                    {m['admin.propositions.import.resolve.warnings']()}
                </CardTitle>
                <CardDescription>{m['admin.propositions.import.resolve.warnings_desc']()}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                {#each warningConflicts as conflict}
                    {@const conflictIndex = conflictReport?.conflicts.indexOf(conflict) ?? 0}
                    <ConflictItem {conflict} {conflictIndex} onResolve={handleResolution} />
                {/each}
            </CardContent>
        </Card>
    {/if}

    <!-- Actions -->
    <div class="flex justify-between">
        <Button variant="outline" onclick={goBack}>
            {m['common.back']()}
        </Button>
        <div class="flex gap-2">
            <span class="self-center text-sm text-muted-foreground">
                {m['admin.propositions.import.resolve.progress']({
                    resolved: store.getResolvedConflictsCount(),
                    total: store.getTotalConflictsCount(),
                })}
            </span>
            <Button onclick={proceedToExecution} disabled={!canProceed || isLoading} loading={isLoading}>
                {m['admin.propositions.import.resolve.proceed']()}
            </Button>
        </div>
    </div>
</div>
