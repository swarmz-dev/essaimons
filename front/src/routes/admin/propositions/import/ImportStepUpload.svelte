<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { m } from '#lib/paraglide/messages';
    import { propositionImportExportStore } from '#lib/stores/propositionImportExportStore.svelte';
    import { showToast } from '#lib/services/toastService';
    import { wrappedFetch } from '#lib/services/requestService';
    import type { ConflictReport } from 'backend/types';
    import { PUBLIC_API_BASE_URI } from '$env/static/public';

    const store = propositionImportExportStore;

    let fileInput: HTMLInputElement;
    let selectedFile: File | null = $state(null);
    let isDragging = $state(false);

    const handleFileSelect = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedFile = target.files[0];
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        isDragging = false;

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                selectedFile = file;
            } else {
                showToast(m['admin.propositions.import.error.invalid_file'](), 'error');
            }
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        isDragging = true;
    };

    const handleDragLeave = () => {
        isDragging = false;
    };

    const analyzeFile = async () => {
        if (!selectedFile) {
            return;
        }

        store.setLoading(true);
        store.setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('client_token='))
                ?.split('=')[1];

            const response = await fetch(`${PUBLIC_API_BASE_URI}/api/admin/propositions/import/analyze`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const conflictReport: ConflictReport = await response.json();

            if (conflictReport.validationErrors && conflictReport.validationErrors.length > 0) {
                store.setError(conflictReport.validationErrors.join(', '));
                showToast(m['admin.propositions.import.error.validation'](), 'error');
                return;
            }

            store.setConflictReport(conflictReport);
            store.setStep('resolve');
            showToast(m['admin.propositions.import.analyze.success'](), 'success');
        } catch (error) {
            store.setError(String(error));
            showToast(m['admin.propositions.import.error.analyze'](), 'error');
        } finally {
            store.setLoading(false);
        }
    };
</script>

<Card>
    <CardHeader>
        <CardTitle>{m['admin.propositions.import.upload.title']()}</CardTitle>
        <CardDescription>{m['admin.propositions.import.upload.description']()}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
        <!-- Drag & Drop Zone -->
        <div
            class="border-2 border-dashed rounded-lg p-12 text-center transition-colors {isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}"
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
        >
            {#if selectedFile}
                <div class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="font-medium">{selectedFile.name}</p>
                    <p class="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                        variant="outline"
                        onclick={() => {
                            selectedFile = null;
                            if (fileInput) fileInput.value = '';
                        }}
                    >
                        {m['common.remove']()}
                    </Button>
                </div>
            {:else}
                <div class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p class="text-sm font-medium">{m['admin.propositions.import.upload.drag']()}</p>
                    <p class="text-sm text-muted-foreground">{m['admin.propositions.import.upload.or']()}</p>
                    <Button
                        variant="secondary"
                        onclick={() => {
                            fileInput.click();
                        }}
                    >
                        {m['admin.propositions.import.upload.browse']()}
                    </Button>
                </div>
            {/if}
        </div>

        <input type="file" accept=".json,application/json" class="hidden" bind:this={fileInput} onchange={handleFileSelect} />

        {#if store.error}
            <div class="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {store.error}
            </div>
        {/if}

        <!-- Actions -->
        <div class="flex justify-end space-x-2">
            <Button onclick={analyzeFile} disabled={!selectedFile || store.isLoading} loading={store.isLoading}>
                {m['admin.propositions.import.upload.analyze']()}
            </Button>
        </div>
    </CardContent>
</Card>
