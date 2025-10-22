<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { Title } from '#lib/components/ui/title';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { Checkbox } from '#lib/components/ui/checkbox';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import { wrappedFetch } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';
    import type { PaginatedPropositions, SerializedProposition } from 'backend/types';
    import { PUBLIC_API_BASE_URI } from '$env/static/public';

    let isExporting = $state(false);
    let isLoadingPropositions = $state(false);
    let loadError = $state<string | null>(null);
    let selectedPropositions = $state<Set<string>>(new Set());
    let propositions = $state<SerializedProposition[]>([]);
    let query = $state('');
    let currentPage = $state(1);
    let totalPages = $state(1);
    let limit = $state(20);

    // Options d'export
    let includeStatusHistory = $state(false);
    let includeVotes = $state(false);
    let includeBallots = $state(false);
    let includeMandates = $state(true);
    let includeComments = $state(false);
    let includeEvents = $state(false);
    let includeReactions = $state(false);

    const loadPropositions = async (page: number = 1) => {
        isLoadingPropositions = true;
        loadError = null;

        const result = await wrappedFetch(
            `/propositions?page=${page}&limit=${limit}&query=${query}`,
            { method: 'GET' },
            (response: any) => {
                if (!response || !response.propositions) {
                    console.error('Invalid response structure:', response);
                    loadError = 'La structure de la réponse est invalide';
                    return;
                }
                propositions = response.propositions;
                currentPage = response.currentPage ?? 1;
                totalPages = response.lastPage ?? 1;
            },
            (error: any) => {
                console.error('Error loading propositions:', error);
                loadError = error?.message || 'Impossible de charger les propositions';
                propositions = [];
            }
        );

        // Handle error from wrappedFetch
        if (result?.isSuccess === false) {
            loadError = result?.error || 'Une erreur est survenue lors du chargement';
            propositions = [];
        }

        isLoadingPropositions = false;
    };

    // Load propositions on mount
    $effect(() => {
        loadPropositions(1);
    });

    // Debounce search query
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;
    $effect(() => {
        // React to query changes
        query;

        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadPropositions(1);
        }, 300);
    });

    const toggleProposition = (id: string) => {
        if (selectedPropositions.has(id)) {
            selectedPropositions.delete(id);
        } else {
            selectedPropositions.add(id);
        }
        selectedPropositions = new Set(selectedPropositions);
    };

    const toggleAll = () => {
        if (selectedPropositions.size === propositions.length) {
            selectedPropositions.clear();
        } else {
            selectedPropositions = new Set(propositions.map((p) => p.id));
        }
        selectedPropositions = new Set(selectedPropositions);
    };

    const exportPropositions = async () => {
        if (selectedPropositions.size === 0) {
            showToast(m['admin.propositions.export.error.no_selection'](), 'error');
            return;
        }

        isExporting = true;

        try {
            const token = document.cookie
                .split('; ')
                .find((row) => row.startsWith('client_token='))
                ?.split('=')[1];

            const response = await fetch(`${PUBLIC_API_BASE_URI}/api/admin/propositions/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                    propositionIds: Array.from(selectedPropositions),
                    options: {
                        includeStatusHistory,
                        includeVotes,
                        includeBallots,
                        includeMandates,
                        includeComments,
                        includeEvents,
                        includeReactions,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Export failed:', response.status, errorData);
                showToast(errorData.error || m['admin.propositions.export.error.default'](), 'error');
                return;
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `propositions-export-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast(m['admin.propositions.export.success'](), 'success');
            selectedPropositions.clear();
            selectedPropositions = new Set(selectedPropositions);
        } catch (error: any) {
            console.error('Export error:', error);
            showToast(error?.message || m['admin.propositions.export.error.default'](), 'error');
        } finally {
            isExporting = false;
        }
    };
</script>

<Title title={m['admin.propositions.export.title']()} hasBackground />

<div class="space-y-6">
    <!-- Options d'export -->
    <Card>
        <CardHeader>
            <CardTitle>{m['admin.propositions.export.options.title']()}</CardTitle>
            <CardDescription>{m['admin.propositions.export.options.description']()}</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeStatusHistory} />
                    <span>{m['admin.propositions.export.options.status_history']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeVotes} />
                    <span>{m['admin.propositions.export.options.votes']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeBallots} disabled={!includeVotes} />
                    <span>{m['admin.propositions.export.options.ballots']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeMandates} />
                    <span>{m['admin.propositions.export.options.mandates']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeComments} />
                    <span>{m['admin.propositions.export.options.comments']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeEvents} />
                    <span>{m['admin.propositions.export.options.events']()}</span>
                </label>
                <label class="flex items-center space-x-2">
                    <Checkbox bind:checked={includeReactions} />
                    <span>{m['admin.propositions.export.options.reactions']()}</span>
                </label>
            </div>
        </CardContent>
    </Card>

    <!-- Sélection des propositions -->
    <Card>
        <CardHeader>
            <div class="flex items-center justify-between">
                <div>
                    <CardTitle>{m['admin.propositions.export.select.title']()}</CardTitle>
                    <CardDescription>
                        {m['admin.propositions.export.select.description']({ count: selectedPropositions.size })}
                    </CardDescription>
                </div>
                <Button onclick={exportPropositions} disabled={selectedPropositions.size === 0 || isExporting} loading={isExporting}>
                    {m['admin.propositions.export.button']()}
                </Button>
            </div>
        </CardHeader>
        <CardContent class="space-y-4">
            <Input type="text" bind:value={query} placeholder={m['common.search.placeholder']()} />

            {#if loadError}
                <div class="rounded-md border border-destructive bg-destructive/10 p-4">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        <div>
                            <p class="font-medium text-destructive">Erreur de chargement</p>
                            <p class="text-sm text-destructive/80">{loadError}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" class="mt-3" onclick={() => loadPropositions(currentPage)}>Réessayer</Button>
                </div>
            {/if}

            <div class="rounded-md border">
                <table class="w-full">
                    <thead>
                        <tr class="border-b bg-muted/50">
                            <th class="p-2 text-left">
                                <Checkbox checked={selectedPropositions.size === propositions.length && propositions.length > 0} onCheckedChange={toggleAll} disabled={isLoadingPropositions} />
                            </th>
                            <th class="p-2 text-left">{m['common.title']()}</th>
                            <th class="p-2 text-left">{m['common.status']()}</th>
                            <th class="p-2 text-left">{m['common.creator']()}</th>
                            <th class="p-2 text-left">{m['common.created_at']()}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if isLoadingPropositions}
                            <tr>
                                <td colspan="5" class="p-8 text-center text-muted-foreground">
                                    <div class="flex flex-col items-center gap-2">
                                        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                        <p>Chargement des propositions...</p>
                                    </div>
                                </td>
                            </tr>
                        {:else if propositions.length === 0}
                            <tr>
                                <td colspan="5" class="p-4 text-center text-muted-foreground">
                                    {m['admin.datatable.no-result']()}
                                </td>
                            </tr>
                        {:else}
                            {#each propositions as proposition}
                                <tr class="border-b hover:bg-muted/30">
                                    <td class="p-2">
                                        <Checkbox checked={selectedPropositions.has(proposition.id)} onCheckedChange={() => toggleProposition(proposition.id)} />
                                    </td>
                                    <td class="p-2">{proposition.title}</td>
                                    <td class="p-2">{proposition.status}</td>
                                    <td class="p-2">{proposition.creator?.username ?? ''}</td>
                                    <td class="p-2">{proposition.createdAt ? new Date(proposition.createdAt).toLocaleDateString() : ''}</td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            {#if totalPages > 1}
                <div class="flex items-center justify-between">
                    <Button variant="outline" onclick={() => loadPropositions(currentPage - 1)} disabled={currentPage === 1 || isLoadingPropositions}>Précédent</Button>
                    <span class="text-sm">Page {currentPage} / {totalPages}</span>
                    <Button variant="outline" onclick={() => loadPropositions(currentPage + 1)} disabled={currentPage === totalPages || isLoadingPropositions}>Suivant</Button>
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
