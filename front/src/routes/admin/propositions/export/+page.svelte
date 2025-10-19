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

    let isExporting = $state(false);
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
        await wrappedFetch(`/propositions?page=${page}&limit=${limit}&search=${query}`, { method: 'GET' }, ({ data }: { data: PaginatedPropositions }) => {
            propositions = data.data ?? [];
            currentPage = data.meta.currentPage;
            totalPages = data.meta.lastPage;
        });
    };

    $effect(() => {
        loadPropositions(currentPage);
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
            const response = await fetch('/api/admin/propositions/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${document.cookie.split('=')[1]}`,
                },
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
                throw new Error('Export failed');
            }

            // Télécharger le fichier
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
        } catch (error) {
            showToast(m['admin.propositions.export.error.default'](), 'error');
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

            <div class="rounded-md border">
                <table class="w-full">
                    <thead>
                        <tr class="border-b bg-muted/50">
                            <th class="p-2 text-left">
                                <Checkbox checked={selectedPropositions.size === propositions.length && propositions.length > 0} onCheckedChange={toggleAll} />
                            </th>
                            <th class="p-2 text-left">{m['common.title']()}</th>
                            <th class="p-2 text-left">{m['common.status']()}</th>
                            <th class="p-2 text-left">{m['common.creator']()}</th>
                            <th class="p-2 text-left">{m['common.created_at']()}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if propositions.length === 0}
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
                                    <td class="p-2">{new Date(proposition.createdAt).toLocaleDateString()}</td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            {#if totalPages > 1}
                <div class="flex items-center justify-between">
                    <Button variant="outline" onclick={() => loadPropositions(currentPage - 1)} disabled={currentPage === 1}>Précédent</Button>
                    <span class="text-sm">Page {currentPage} / {totalPages}</span>
                    <Button variant="outline" onclick={() => loadPropositions(currentPage + 1)} disabled={currentPage === totalPages}>Suivant</Button>
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
