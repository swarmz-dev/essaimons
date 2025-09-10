<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import type { PaginatedLanguages, SerializedLanguage } from 'backend/types';
    import { wrappedFetch } from '#lib/services/requestService';
    import { DataTable } from '#lib/components/ui/data-table';
    import { getLanguageColumns } from './columns';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';

    let paginatedLanguages: PaginatedLanguages | undefined = $state();
    let selectedLanguages: string[] = $state([]);
    let query: string = $state('');
    let sortBy: string = $state('name:asc');

    onMount(async (): Promise<void> => {
        if (page.data.isSuccess) {
            paginatedLanguages = page.data.data;
        } else {
            await getLanguages();
        }
    });

    const handleSort = (field: string, order: 'asc' | 'desc'): void => {
        sortBy = `${field}:${order}`;
        getLanguages();
    };

    const handleDelete = (codes: string[]): void => {
        if (!paginatedLanguages) {
            return;
        }

        codes.forEach((code: string): void => {
            paginatedLanguages!.languages = paginatedLanguages!.languages.filter((language: SerializedLanguage): boolean => language.code !== code);
            paginatedLanguages!.total = paginatedLanguages!.total - 1;
        });
    };

    const getLanguages = async (page: number = 1, limit: number = 10): Promise<void> => {
        await wrappedFetch(`/admin/language?page=${page}&limit=${limit}&query=${query}&sortBy=${sortBy}`, { method: 'GET' }, ({ data }): void => {
            paginatedLanguages = data;
        });
    };
</script>

<Title title={m['admin.language.title']()} hasBackground />

<Breadcrumb items={[{ title: 'Admin', href: '/admin' }, { title: m['admin.language.title']() }]} />

{#if paginatedLanguages}
    <div class="mt-3">
        <DataTable
            paginatedObject={paginatedLanguages}
            data={paginatedLanguages.languages}
            columns={getLanguageColumns(handleSort, handleDelete)}
            onSearch={getLanguages}
            bind:query
            bind:selectedRows={selectedLanguages}
            onBatchDelete={handleDelete}
            batchDeleteTitle={m['admin.language.delete.title']({ languages: selectedLanguages })}
            batchDeleteText={m['admin.language.delete.text']({ languages: selectedLanguages, count: selectedLanguages.length })}
            onPaginationChange={async (page: number, limit: number) => await getLanguages(page, limit)}
        />
    </div>
{/if}
