<script lang="ts">
    import { Title } from '#lib/components/ui/title';
    import { m } from '#lib/paraglide/messages';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import type { PaginatedUsers, SerializedUser } from 'backend/types';
    import { wrappedFetch } from '#lib/services/requestService';
    import { DataTable } from '#lib/components/ui/data-table';
    import { getUserColumns } from './columns';
    import { Breadcrumb } from '#lib/components/ui/breadcrumb';

    let paginatedUsers: PaginatedUsers | undefined = $state();
    let selectedUsers: string[] = $state([]);
    let query: string = $state('');
    let sortBy: string = $state('email:asc');

    onMount(async (): Promise<void> => {
        if (page.data.isSuccess) {
            paginatedUsers = page.data.data;
        } else {
            await getUsers();
        }
    });

    const handleSort = (field: string, order: 'asc' | 'desc'): void => {
        sortBy = `${field}:${order}`;
        getUsers();
    };

    const handleDelete = (ids: number[] | string[]): void => {
        if (!paginatedUsers) {
            return;
        }

        ids.forEach((id: number | string): void => {
            paginatedUsers!.users = paginatedUsers!.users.filter((user: SerializedUser): boolean => user.id !== id);
            paginatedUsers!.total = paginatedUsers!.total - 1;
        });
    };

    const getUsers = async (page: number = 1, limit: number = 10): Promise<void> => {
        await wrappedFetch(`/admin/user?page=${page}&limit=${limit}&query=${query}&sortBy=${sortBy}`, { method: 'GET' }, ({ data }): void => {
            paginatedUsers = data;
        });
    };
</script>

<Title title={m['admin.user.title']()} hasBackground />

<Breadcrumb items={[{ title: 'Admin', href: '/admin' }, { title: m['admin.user.title']() }]} />

{#if paginatedUsers}
    <div class="mt-3">
        <DataTable
            paginatedObject={paginatedUsers}
            data={paginatedUsers.users}
            columns={getUserColumns(handleSort, handleDelete)}
            onSearch={getUsers}
            bind:query
            bind:selectedRows={selectedUsers}
            onBatchDelete={handleDelete}
            batchDeleteTitle={m['admin.user.delete.title']({ users: selectedUsers })}
            batchDeleteText={m['admin.user.delete.text']({ users: selectedUsers, count: selectedUsers.length })}
            onPaginationChange={async (page: number, limit: number) => await getUsers(page, limit)}
        />
    </div>
{/if}
