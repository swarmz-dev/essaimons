<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { Title } from '#lib/components/ui/title';
    import Meta from '#components/Meta.svelte';
    import { Card, CardContent, CardHeader, CardTitle } from '#lib/components/ui/card';
    import { Button } from '#lib/components/ui/button';
    import { ArrowRight, Vote, Briefcase, Clock, User, Loader2 } from '@lucide/svelte';
    import { goto } from '$app/navigation';
    import type { PaginatedPropositions, SerializedPropositionListItem } from 'backend/types';

    interface PageData {
        voting: PaginatedPropositions;
        mandate: PaginatedPropositions;
        recent: PaginatedPropositions;
        user: PaginatedPropositions | null;
    }

    const { data } = $props<{ data: PageData }>();

    const formatDate = (value?: string): string => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        const locale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    };

    const translateStatus = (status: string): string => {
        const key = `proposition-detail.status.label.${status}` as keyof typeof m;
        const translator = m[key];
        return typeof translator === 'function' ? (translator as () => string)() : status;
    };

    let loadingPropositionId = $state<string | null>(null);

    const openProposal = async (id: string) => {
        loadingPropositionId = id;
        await goto(`/propositions/${id}`);
        // Note: loadingPropositionId will be reset when the component unmounts on navigation
    };

    const hasUserContributions = $derived(data.user && data.user.propositions.length > 0);
</script>

<Meta title={m['home.meta.title']()} description={m['home.meta.description']()} keywords={m['home.meta.keywords']().split(', ')} pathname="/" />

<Title title={m['home.title']()} />

<div class="space-y-8">
    <!-- Voting Phase Proposals -->
    {#if data.voting.propositions.length > 0}
        <section>
            <div class="mb-4 flex items-center gap-2">
                <Vote class="size-6 text-primary" />
                <h2 class="text-2xl font-semibold">Propositions à voter</h2>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each data.voting.propositions as proposition (proposition.id)}
                    <Card class="relative cursor-pointer transition hover:shadow-lg" onclick={() => openProposal(proposition.id)}>
                        <CardHeader>
                            <div class="mb-2">
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                                    {translateStatus(proposition.status)}
                                </span>
                            </div>
                            <CardTitle class="text-lg">{proposition.title}</CardTitle>
                            <p class="text-sm text-muted-foreground">
                                Échéance : {formatDate(proposition.voteDeadline)}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <p class="line-clamp-2 text-sm text-foreground/80">{proposition.summary}</p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                {#each proposition.categories.slice(0, 2) as category (category.id)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {category.name}
                                    </span>
                                {/each}
                            </div>
                        </CardContent>
                        {#if loadingPropositionId === proposition.id}
                            <div class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 class="size-8 animate-spin text-primary" />
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>
            <div class="mt-4 text-center">
                <Button variant="outline" onclick={() => goto('/propositions?statuses=vote')}>
                    Voir toutes les propositions à voter
                    <ArrowRight class="ml-2 size-4" />
                </Button>
            </div>
        </section>
    {/if}

    <!-- User Contributions -->
    {#if hasUserContributions}
        <section>
            <div class="mb-4 flex items-center gap-2">
                <User class="size-6 text-primary" />
                <h2 class="text-2xl font-semibold">Mes propositions</h2>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each data.user.propositions as proposition (proposition.id)}
                    <Card class="relative cursor-pointer transition hover:shadow-lg" onclick={() => openProposal(proposition.id)}>
                        <CardHeader>
                            <div class="mb-2">
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                                    {translateStatus(proposition.status)}
                                </span>
                            </div>
                            <CardTitle class="text-lg">{proposition.title}</CardTitle>
                            <p class="text-sm text-muted-foreground">
                                Mise à jour : {formatDate(proposition.updatedAt)}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <p class="line-clamp-2 text-sm text-foreground/80">{proposition.summary}</p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                {#each proposition.categories.slice(0, 2) as category (category.id)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {category.name}
                                    </span>
                                {/each}
                            </div>
                        </CardContent>
                        {#if loadingPropositionId === proposition.id}
                            <div class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 class="size-8 animate-spin text-primary" />
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Mandate Phase Proposals -->
    {#if data.mandate.propositions.length > 0}
        <section>
            <div class="mb-4 flex items-center gap-2">
                <Briefcase class="size-6 text-primary" />
                <h2 class="text-2xl font-semibold">Propositions à mandater</h2>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each data.mandate.propositions as proposition (proposition.id)}
                    <Card class="relative cursor-pointer transition hover:shadow-lg" onclick={() => openProposal(proposition.id)}>
                        <CardHeader>
                            <div class="mb-2">
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                                    {translateStatus(proposition.status)}
                                </span>
                            </div>
                            <CardTitle class="text-lg">{proposition.title}</CardTitle>
                            <p class="text-sm text-muted-foreground">
                                Échéance : {formatDate(proposition.mandateDeadline)}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <p class="line-clamp-2 text-sm text-foreground/80">{proposition.summary}</p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                {#each proposition.categories.slice(0, 2) as category (category.id)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {category.name}
                                    </span>
                                {/each}
                            </div>
                        </CardContent>
                        {#if loadingPropositionId === proposition.id}
                            <div class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 class="size-8 animate-spin text-primary" />
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>
            <div class="mt-4 text-center">
                <Button variant="outline" onclick={() => goto('/propositions?statuses=mandate')}>
                    Voir toutes les propositions à mandater
                    <ArrowRight class="ml-2 size-4" />
                </Button>
            </div>
        </section>
    {/if}

    <!-- Recent Proposals -->
    {#if data.recent.propositions.length > 0}
        <section>
            <div class="mb-4 flex items-center gap-2">
                <Clock class="size-6 text-primary" />
                <h2 class="text-2xl font-semibold">Propositions récentes</h2>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each data.recent.propositions as proposition (proposition.id)}
                    <Card class="relative cursor-pointer transition hover:shadow-lg" onclick={() => openProposal(proposition.id)}>
                        <CardHeader>
                            <div class="mb-2">
                                <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                                    {translateStatus(proposition.status)}
                                </span>
                            </div>
                            <CardTitle class="text-lg">{proposition.title}</CardTitle>
                            <p class="text-sm text-muted-foreground">
                                Mise à jour : {formatDate(proposition.updatedAt)}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <p class="line-clamp-2 text-sm text-foreground/80">{proposition.summary}</p>
                            <div class="mt-3 flex flex-wrap gap-2">
                                {#each proposition.categories.slice(0, 2) as category (category.id)}
                                    <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                        {category.name}
                                    </span>
                                {/each}
                            </div>
                        </CardContent>
                        {#if loadingPropositionId === proposition.id}
                            <div class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 class="size-8 animate-spin text-primary" />
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>
            <div class="mt-4 text-center">
                <Button variant="outline" onclick={() => goto('/propositions')}>
                    Voir toutes les propositions
                    <ArrowRight class="ml-2 size-4" />
                </Button>
            </div>
        </section>
    {/if}
</div>
