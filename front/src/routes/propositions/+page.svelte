<script lang="ts">
    import Meta from '#components/Meta.svelte';
    import Search from '#components/Search.svelte';
    import Pagination from '#components/Pagination.svelte';
    import { Button } from '#lib/components/ui/button';
    import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { MultiSelect, type MultiSelectOption } from '#lib/components/ui/multi-select';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table';
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { goto } from '$app/navigation';
    import type { PaginatedPropositions, SerializedPropositionCategory, SerializedPropositionListItem, PropositionStatusEnum } from 'backend/types';
    import { LayoutGrid, TableProperties, RotateCcw, ArrowRight } from '@lucide/svelte';

    type ActiveFilters = {
        search: string;
        categories: string[];
        statuses: string[];
        view: 'card' | 'table';
        limit: number;
        page: number;
    };

    type PageData = PaginatedPropositions & {
        filters: {
            categories: SerializedPropositionCategory[];
            statuses: PropositionStatusEnum[];
        };
        activeFilters: ActiveFilters;
    };

    const { data } = $props<{ data: PageData }>();

    let query = $state(data.activeFilters.query ?? '');
    let selectedCategories = $state([...data.activeFilters.categories]);
    let selectedStatuses = $state([...(data.activeFilters.statuses ?? [])]);
    let view: 'card' | 'table' = $state(data.activeFilters.view ?? 'card');

    const categoryOptions: MultiSelectOption[] = $derived(data.filters.categories.map((category: SerializedPropositionCategory) => ({ value: category.id, label: category.name })));

    const translateStatus = (status: PropositionStatusEnum | string): string => {
        const key = `proposition-detail.status.label.${status}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : status;
    };

    const statusOptions: MultiSelectOption[] = $derived((data.filters.statuses ?? []).map((status: PropositionStatusEnum) => ({ value: status, label: translateStatus(status) })));

    const hasActiveFilters = $derived(Boolean(query.trim()) || selectedCategories.length > 0 || selectedStatuses.length > 0);

    const getVisualUrl = (item: SerializedPropositionListItem): string | undefined => {
        if (!item.visual) {
            return undefined;
        }
        return `/assets/propositions/visual/${item.id}`;
    };

    const isSameSelection = (current: string[], source: string[]): boolean => {
        if (current.length !== source.length) {
            return false;
        }
        const sortedCurrent = [...current].map((value) => value.toString()).sort();
        const sortedSource = [...source].map((value) => value.toString()).sort();
        return sortedCurrent.every((value, index) => value === sortedSource[index]);
    };

    const formatDate = (value?: string): string => {
        if (!value) {
            return m['proposition-list.dates.empty']();
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    };

    const parseDateValue = (value?: string): number | null => {
        if (!value) {
            return null;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed.getTime();
    };

    const getOverduePhase = (item: SerializedPropositionListItem): string | null => {
        const now = Date.now();

        switch (item.status) {
            case 'clarify': {
                const deadline = parseDateValue(item.clarificationDeadline);
                return deadline !== null && deadline < now ? 'clarification' : null;
            }
            case 'amend': {
                const deadline = parseDateValue(item.amendmentDeadline);
                return deadline !== null && deadline < now ? 'amendment' : null;
            }
            case 'vote': {
                const deadline = parseDateValue(item.voteDeadline);
                return deadline !== null && deadline < now ? 'vote' : null;
            }
            case 'mandate': {
                const deadline = parseDateValue(item.mandateDeadline);
                return deadline !== null && deadline < now ? 'mandate' : null;
            }
            case 'evaluate': {
                const deadline = parseDateValue(item.evaluationDeadline);
                return deadline !== null && deadline < now ? 'evaluation' : null;
            }
            default:
                return null;
        }
    };

    const getPhaseLabel = (phase: string): string => {
        const key = `proposition-detail.dates.${phase}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? translator() : phase;
    };

    const updateQuery = async (updates: { search?: string; categories?: string[]; statuses?: string[]; page?: number; limit?: number; view?: 'card' | 'table' }): Promise<void> => {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const originalQuery = params.toString();

        if (updates.search !== undefined) {
            const normalized = updates.search.trim();
            if (normalized.length) {
                params.set('query', normalized);
            } else {
                params.delete('query');
            }
        }

        if (updates.categories !== undefined) {
            params.delete('categories');
            if (updates.categories.length) {
                updates.categories
                    .map((id) => id?.toString().trim())
                    .filter((id): id is string => Boolean(id))
                    .forEach((id) => params.append('categories', id));
            }
        }

        if (updates.statuses !== undefined) {
            params.delete('statuses');
            if (updates.statuses.length) {
                updates.statuses
                    .map((status) => status?.toString().trim())
                    .filter((status): status is string => Boolean(status))
                    .forEach((status) => params.append('statuses', status));
            }
        }

        if (updates.page !== undefined) {
            params.set('page', String(Math.max(1, updates.page)));
        } else if (updates.search !== undefined || updates.categories !== undefined || updates.statuses !== undefined) {
            params.set('page', '1');
        }

        if (updates.limit !== undefined && Number.isFinite(updates.limit) && updates.limit > 0) {
            params.set('limit', String(Math.floor(updates.limit)));
        }

        if (updates.view !== undefined) {
            params.set('view', updates.view);
        }

        const nextQuery = params.toString();
        if (nextQuery === originalQuery) {
            return;
        }

        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/propositions';
        const querySuffix = nextQuery.length ? `?${nextQuery}` : '';
        await goto(`${currentPath}${querySuffix}`, { replaceState: true, keepFocus: true, noScroll: true });
    };

    const handleSearch = async (): Promise<void> => {
        const normalized = query.trim();
        if (normalized === data.activeFilters.search) {
            return;
        }
        await updateQuery({ search: normalized });
    };

    const handlePagination = async (pageNumber: number, limit: number): Promise<void> => {
        await updateQuery({ page: pageNumber, limit });
    };

    const handleResetFilters = async (): Promise<void> => {
        if (!hasActiveFilters && view === data.activeFilters.view) {
            return;
        }

        query = '';
        selectedCategories = [];
        selectedStatuses = [];

        await updateQuery({ search: '', categories: [], statuses: [], page: 1 });
    };

    const handleToggleView = async (nextView: 'card' | 'table'): Promise<void> => {
        if (view === nextView) {
            return;
        }
        view = nextView;
        await updateQuery({ view: nextView });
    };

    $effect(() => {
        query = data.activeFilters.search ?? '';
        selectedCategories = [...data.activeFilters.categories];
        selectedStatuses = [...(data.activeFilters.statuses ?? [])];
        view = data.activeFilters.view ?? 'card';
    });

    $effect(() => {
        if (isSameSelection(selectedCategories, data.activeFilters.categories)) {
            return;
        }
        void updateQuery({ categories: selectedCategories });
    });

    $effect(() => {
        if (isSameSelection(selectedStatuses, data.activeFilters.statuses ?? [])) {
            return;
        }
        void updateQuery({ statuses: selectedStatuses });
    });

    const openDetail = async (proposition: SerializedPropositionListItem): Promise<void> => {
        await goto(`/propositions/${proposition.id}`);
    };
</script>

<Meta title={m['proposition-list.meta.title']()} description={m['proposition-list.meta.description']()} keywords={m['proposition-list.meta.keywords']().split(', ')} pathname="/propositions" />

<Title title={m['proposition-list.title']()} />
<p class="-mt-4 text-sm text-muted-foreground md:text-base">{m['proposition-list.introduction']()}</p>

<div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-3 justify-between">
        <Search bind:search={query} resultsArray={data.propositions} placeholder={m['proposition-list.search.placeholder']()} onSearch={handleSearch} />
        <div class="flex gap-2">
            <Button variant={view === 'card' ? 'default' : 'outline'} onclick={() => handleToggleView('card')} aria-pressed={view === 'card'}>
                <LayoutGrid class="size-4" />
                <span class="ml-2 hidden sm:inline">{m['proposition-list.view.card']()}</span>
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} onclick={() => handleToggleView('table')} aria-pressed={view === 'table'}>
                <TableProperties class="size-4" />
                <span class="ml-2 hidden sm:inline">{m['proposition-list.view.table']()}</span>
            </Button>
        </div>
    </div>

    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="grid w-full gap-3 md:w-2/3 md:grid-cols-2">
            <MultiSelect options={categoryOptions} bind:selectedValues={selectedCategories} placeholder={m['proposition-list.filters.categories.placeholder']()} />
            <MultiSelect options={statusOptions} bind:selectedValues={selectedStatuses} placeholder={m['proposition-list.filters.statuses.placeholder']()} />
        </div>
        <Button variant="ghost" onclick={handleResetFilters} disabled={!hasActiveFilters}>
            <RotateCcw class="size-4" />
            <span class="ml-2">{m['proposition-list.filters.reset']()}</span>
        </Button>
    </div>

    {#if data.propositions.length === 0}
        <p class="rounded-lg border border-dashed border-foreground/20 bg-foreground/5 p-6 text-center text-sm text-muted-foreground">
            {m['proposition-list.empty']()}
        </p>
    {:else if view === 'card'}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {#each data.propositions as proposition, index (proposition.id ?? index)}
                <Card class="flex flex-col justify-between">
                    <CardHeader class="space-y-3">
                        {@const visual = getVisualUrl(proposition)}
                        {@const statusLabel = translateStatus(proposition.status)}
                        {@const overduePhase = getOverduePhase(proposition)}
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                                {statusLabel}
                            </span>
                            {#if overduePhase}
                                <span class="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                                    {m['proposition-list.badges.overdue']({ phase: getPhaseLabel(overduePhase) })}
                                </span>
                            {/if}
                        </div>
                        {#if visual}
                            <div class="overflow-hidden rounded-xl border border-border/30 bg-muted/30">
                                <img src={visual} alt={m['proposition-list.visual.alt']({ title: proposition.title })} class="h-40 w-full object-cover" loading="lazy" />
                            </div>
                        {:else}
                            <div class="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/20 text-xs text-muted-foreground">
                                {m['proposition-list.visual.placeholder']()}
                            </div>
                        {/if}
                        <div class="space-y-1">
                            <CardTitle class="text-xl font-semibold">{proposition.title}</CardTitle>
                            <p class="text-sm text-muted-foreground">{formatDate(proposition.updatedAt)}</p>
                        </div>
                    </CardHeader>
                    <CardContent class="flex flex-col gap-3">
                        <p class="text-sm text-foreground/90 overflow-hidden text-ellipsis" style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;">
                            {proposition.summary}
                        </p>
                        <div class="flex flex-wrap gap-2">
                            {#each proposition.categories as category (category.id)}
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                    {category.name}
                                </span>
                            {/each}
                        </div>
                        <div class="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                            <div>
                                <span class="font-semibold text-foreground/80">{m['proposition-list.dates.vote']()}:</span>
                                <span class="ml-2">{formatDate(proposition.voteDeadline)}</span>
                            </div>
                            <div>
                                <span class="font-semibold text-foreground/80">{m['proposition-list.dates.mandate']()}:</span>
                                <span class="ml-2">{formatDate(proposition.mandateDeadline)}</span>
                            </div>
                        </div>
                        {#if proposition.statusStartedAt}
                            <p class="text-xs text-muted-foreground">
                                {m['proposition-list.badges.status-since']({ date: formatDate(proposition.statusStartedAt) })}
                            </p>
                        {/if}
                    </CardContent>
                    <CardFooter class="flex justify-end">
                        <Button variant="outline" class="gap-2" onclick={() => openDetail(proposition)}>
                            {m['proposition-list.actions.view']()}
                            <ArrowRight class="size-4" />
                        </Button>
                    </CardFooter>
                </Card>
            {/each}
        </div>
    {:else}
        <div class="overflow-hidden rounded-lg border border-border/60">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{m['proposition-list.table.columns.title']()}</TableHead>
                        <TableHead>{m['proposition-list.table.columns.summary']()}</TableHead>
                        <TableHead>{m['proposition-list.table.columns.categories']()}</TableHead>
                        <TableHead>{m['proposition-list.table.columns.status']()}</TableHead>
                        <TableHead>{m['proposition-list.table.columns.vote']()}</TableHead>
                        <TableHead>{m['proposition-list.table.columns.updated']()}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {#each data.propositions as proposition, index (proposition.id ?? index)}
                        <TableRow class="cursor-pointer hover:bg-primary/5" onclick={() => openDetail(proposition)}>
                            {@const tableOverdue = getOverduePhase(proposition)}
                            <TableCell class="font-semibold">{proposition.title}</TableCell>
                            <TableCell class="max-w-xs text-sm text-muted-foreground">{proposition.summary}</TableCell>
                            <TableCell>
                                <div class="flex flex-wrap gap-1">
                                    {#each proposition.categories as category (category.id)}
                                        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{category.name}</span>
                                    {/each}
                                </div>
                            </TableCell>
                            <TableCell class="text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary capitalize">
                                        {translateStatus(proposition.status)}
                                    </span>
                                    {#if tableOverdue}
                                        <span class="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                            {m['proposition-list.badges.overdue']({ phase: getPhaseLabel(tableOverdue) })}
                                        </span>
                                    {/if}
                                </div>
                            </TableCell>
                            <TableCell>{formatDate(proposition.voteDeadline)}</TableCell>
                            <TableCell>{formatDate(proposition.updatedAt)}</TableCell>
                        </TableRow>
                    {/each}
                </TableBody>
            </Table>
        </div>
    {/if}

    <Pagination
        paginatedObject={{
            currentPage: data.currentPage,
            firstPage: data.firstPage,
            lastPage: data.lastPage,
            limit: data.limit,
            total: data.total,
        }}
        onChange={handlePagination}
    />
</div>
