<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { m } from '#lib/paraglide/messages';
    import { propositionImportExportStore } from '#lib/stores/propositionImportExportStore.svelte';
    import { showToast } from '#lib/services/toastService';
    import type { ImportResult } from 'backend/types';
    import { PUBLIC_API_BASE_URI } from '$env/static/public';

    const store = propositionImportExportStore;

    const configuration = $derived(store.configuration);
    const isExecuting = $derived(store.isLoading);

    const executeImport = async () => {
        if (!configuration) {
            return;
        }

        store.setLoading(true);
        store.setError(null);

        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('client_token='))
                ?.split('=')[1];

            console.log('Executing import with configuration:', configuration);
            console.log('URL:', `${PUBLIC_API_BASE_URI}/api/admin/propositions/import/execute`);

            const response = await fetch(`${PUBLIC_API_BASE_URI}/api/admin/propositions/import/execute`, {
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
                console.error('Import execution failed:', response.status, errorData);
                throw new Error(errorData.error || 'Import execution failed');
            }

            const data = await response.json();
            const result: ImportResult = data.result;

            store.setResult(result);

            if (result.success) {
                store.setStep('complete');
                showToast(m['admin.propositions.import.execute.success'](), 'success');
            } else {
                store.setError(result.errors.join(', '));
                showToast(m['admin.propositions.import.execute.error'](), 'error');
            }
        } catch (error) {
            store.setError(String(error));
            showToast(m['admin.propositions.import.error.execute'](), 'error');
        } finally {
            store.setLoading(false);
        }
    };

    const goBack = () => {
        store.setStep('resolve');
    };
</script>

<Card>
    <CardHeader>
        <CardTitle>{m['admin.propositions.import.execute.title']()}</CardTitle>
        <CardDescription>{m['admin.propositions.import.execute.description']()}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
        <!-- Summary -->
        <div class="rounded-lg bg-muted p-4">
            <h4 class="font-medium mb-4">{m['admin.propositions.import.execute.summary']()}</h4>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span>{m['admin.propositions.import.execute.propositions']()}</span>
                    <span class="font-medium">{store.conflictReport?.summary.totalPropositions ?? 0}</span>
                </div>
                <div class="flex justify-between">
                    <span>{m['admin.propositions.import.execute.conflicts_resolved']()}</span>
                    <span class="font-medium">{store.getResolvedConflictsCount()}</span>
                </div>
                <div class="flex justify-between text-green-600 dark:text-green-400">
                    <span>{m['admin.propositions.import.execute.will_create']()}</span>
                    <span class="font-medium">{store.getWillCreateCount()}</span>
                </div>
                <div class="flex justify-between text-yellow-600 dark:text-yellow-400">
                    <span>{m['admin.propositions.import.execute.will_merge']()}</span>
                    <span class="font-medium">{store.getWillMergeCount()}</span>
                </div>
            </div>
        </div>

        {#if store.error}
            <div class="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {store.error}
            </div>
        {/if}

        <!-- Warning -->
        <div class="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-sm text-yellow-800 dark:text-yellow-300">
            <div class="flex gap-2">
                <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
                <div>
                    <p class="font-medium">{m['admin.propositions.import.execute.warning.title']()}</p>
                    <p class="mt-1">{m['admin.propositions.import.execute.warning.message']()}</p>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between">
            <Button variant="outline" onclick={goBack} disabled={isExecuting}>
                {m['common.back']()}
            </Button>
            <Button onclick={executeImport} disabled={isExecuting} loading={isExecuting}>
                {m['admin.propositions.import.execute.button']()}
            </Button>
        </div>
    </CardContent>
</Card>
