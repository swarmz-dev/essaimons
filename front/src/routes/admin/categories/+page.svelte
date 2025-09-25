<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table';
    import { Card, CardContent } from '#lib/components/ui/card';
    import { Button } from '#lib/components/ui/button';
    import { Input } from '#lib/components/ui/input';
    import { m } from '#lib/paraglide/messages';
    import type { SerializedPropositionCategory } from 'backend/types';

    const { data } = $props<{ data: { categories: SerializedPropositionCategory[] } }>();
    const categories = data.categories ?? [];

    let newCategoryName: string = $state('');
</script>

<Title title={m['admin.categories.title']()} hasBackground />

<section class="flex flex-col gap-6">
    <Card class="bg-white/80 shadow-lg dark:bg-slate-950/70">
        <CardContent class="space-y-6 p-6">
            <div class="space-y-1">
                <p class="text-sm text-muted-foreground">{m['admin.categories.description']()}</p>
                <p class="text-xs font-semibold text-muted-foreground">
                    {m['admin.categories.count']({ count: categories.length })}
                </p>
            </div>

            <form method="POST" action="?/create" class="flex flex-col gap-4 md:flex-row md:items-end">
                <div class="w-full md:flex-1">
                    <Input name="name" bind:value={newCategoryName} label={m['common.name']()} placeholder={m['common.name']()} required />
                </div>
                <Button type="submit" class="md:w-auto">
                    {m['common.create']()}
                </Button>
            </form>
        </CardContent>
    </Card>

    <div class="overflow-hidden rounded-3xl border border-border/60 bg-white/85 shadow-xl backdrop-blur-md dark:bg-slate-950/70">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead class="w-16 text-center">#</TableHead>
                    <TableHead>{m['common.name']()}</TableHead>
                    <TableHead class="w-40 text-right">{m['admin.datatable.actions']()}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {#if categories.length === 0}
                    <TableRow>
                        <TableCell colspan={3} class="py-10 text-center text-sm text-muted-foreground">
                            {m['admin.datatable.no-result']()}
                        </TableCell>
                    </TableRow>
                {:else}
                    {#each categories as category, index (category.id)}
                        <TableRow>
                            <TableCell class="text-center text-sm font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell class="align-middle">
                                <form method="POST" action="?/update" class="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <input type="hidden" name="id" value={category.id} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={category.name}
                                        class="border border-white/50 bg-white/85 selection:bg-primary selection:text-primary-foreground shadow-md backdrop-blur flex h-11 w-full min-w-0 rounded-2xl px-4 text-sm font-medium text-foreground outline-none transition-all duration-200 focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-800/70 dark:bg-slate-900/70"
                                        required
                                    />
                                    <Button type="submit" variant="secondary" class="sm:w-auto">
                                        {m['common.update']()}
                                    </Button>
                                </form>
                            </TableCell>
                            <TableCell class="text-right">
                                <form method="POST" action="?/delete" class="inline-flex">
                                    <input type="hidden" name="id" value={category.id} />
                                    <Button type="submit" variant="destructive">
                                        {m['common.delete']()}
                                    </Button>
                                </form>
                            </TableCell>
                        </TableRow>
                    {/each}
                {/if}
            </TableBody>
        </Table>
    </div>
</section>
