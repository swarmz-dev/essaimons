<script lang="ts">
    import { getCoreRowModel, type Row } from '@tanstack/table-core';
    import type { ColumnDef, RowSelectionState, VisibilityState } from '@tanstack/table-core';
    import { createSvelteTable, FlexRender } from '#lib/components/ui/data-table/index';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table';
    import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '#lib/components/ui/dropdown-menu';
    import { Button } from '#lib/components/ui/button';
    import Search from '#components/Search.svelte';
    import { m } from '#lib/paraglide/messages';
    import Pagination from '#components/Pagination.svelte';
    import type { SerializedLanguage } from 'backend/types';
    import { wrappedFetch } from '#lib/services/requestService';
    import { location } from '#lib/stores/locationStore';
    import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    } from '#lib/components/ui/alert-dialog';
    import { showToast } from '#lib/services/toastService';
    import { Link } from '#lib/components/ui/link';

    interface PaginatedObject {
        currentPage: number;
        firstPage: number;
        lastPage: number;
        limit: number;
        total: number;
    }

    type Props = {
        paginatedObject: PaginatedObject;
        data: any[];
        columns: ColumnDef<any>[];
        onSearch: () => void;
        query: string;
        selectedRows?: string[];
        batchDeleteTitle?: string;
        batchDeleteText?: string;
        onBatchDelete?: (ids: string[] | number[]) => void;
        onPaginationChange: (page: number, limit: number) => void;
    };

    let {
        paginatedObject,
        data = $bindable([]),
        columns,
        onSearch,
        query = $bindable(''),
        selectedRows = $bindable([]),
        batchDeleteTitle,
        batchDeleteText,
        onBatchDelete,
        onPaginationChange,
    }: Props = $props();

    let rowSelection = $state<RowSelectionState>({});
    let columnVisibility = $state<VisibilityState>({});

    let showModal: boolean = $state(false);
    const deletable: boolean = $state(!!(batchDeleteTitle && batchDeleteText));

    const table = createSvelteTable({
        get data() {
            return data;
        },
        onRowSelectionChange: (updater) => {
            if (typeof updater === 'function') {
                rowSelection = updater(rowSelection);
            } else {
                rowSelection = updater;
            }
        },
        onColumnVisibilityChange: (updater) => {
            if (typeof updater === 'function') {
                columnVisibility = updater(columnVisibility);
            } else {
                columnVisibility = updater;
            }
        },
        state: {
            get rowSelection() {
                return rowSelection;
            },
            get columnVisibility() {
                return columnVisibility;
            },
        },
        columns,
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
    });

    const handleDelete = async (): Promise<void> => {
        showModal = false;
        await wrappedFetch(`${$location}/delete`, { method: 'POST', body: { data: [...selectedRows] } }, (data) => {
            const filteredStatuses: { isSuccess: boolean; message: string; id: string }[] = data.messages.filter((status: { isSuccess: boolean; message: string; id: string }) => {
                showToast(status.message, status.isSuccess ? 'success' : 'error');
                return status.isSuccess;
            });

            table.getFilteredSelectedRowModel().rows.forEach((row: Row<SerializedLanguage>): void => {
                row.toggleSelected(false);
            });

            if (onBatchDelete) {
                onBatchDelete(filteredStatuses.map((status: { id: string }) => status.id));
            }
        });
    };

    $effect((): void => {
        selectedRows = table.getFilteredSelectedRowModel().rows.map((row: Row<SerializedLanguage>): string => row.original.id);
    });
</script>

<div class="flex flex-col gap-1">
    <div class="flex gap-5 items-center justify-between py-4">
        <Search bind:search={query} resultsArray={data} minChars={0} {onSearch} />
        <DropdownMenu>
            <DropdownMenuTrigger>
                {#snippet child({ props })}
                    <Button {...props} variant="outline">{m['admin.datatable.columns']()}</Button>
                {/snippet}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
                    <DropdownMenuCheckboxItem class="capitalize" bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}>
                        {column.columnDef.meta?.headerName}
                    </DropdownMenuCheckboxItem>
                {/each}
            </DropdownMenuContent>
        </DropdownMenu>
    </div>

    <div class="rounded-md border bg-gray-300 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-800">
        <Table>
            <TableHeader>
                {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                    <TableRow>
                        {#each headerGroup.headers as header (header.id)}
                            <TableHead colspan={header.colSpan} class={`w-1/${headerGroup.headers.length}`}>
                                {#if !header.isPlaceholder}
                                    <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                                {/if}
                            </TableHead>
                        {/each}
                    </TableRow>
                {/each}
            </TableHeader>
            <TableBody>
                {#each table.getRowModel().rows as row (row.id)}
                    <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        onclick={() => {
                            row.toggleSelected(!row.getIsSelected());
                        }}
                    >
                        {#each row.getVisibleCells() as cell (cell.id)}
                            <TableCell>
                                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} id={row.original.id} />
                            </TableCell>
                        {/each}
                    </TableRow>
                {:else}
                    <TableRow>
                        <TableCell colspan={columns.length} class="h-24 text-center">
                            {m['admin.datatable.no-result']()}
                        </TableCell>
                    </TableRow>
                {/each}
            </TableBody>
        </Table>
    </div>

    <div class="text-muted-foreground flex-1 text-sm">
        {m['admin.datatable.selected-rows']({ count: table.getFilteredSelectedRowModel().rows.length, total: table.getFilteredRowModel().rows.length })}
    </div>

    <Pagination {paginatedObject} onChange={(page: number, limit: number) => onPaginationChange(page, limit)} />

    <div class="w-full flex justify-end gap-5">
        <Button variant="destructive" disabled={!deletable || ![...selectedRows].length} onclick={() => (showModal = true)}>
            {m['common.delete']()}
        </Button>
        <Button variant="secondary">
            <Link href={`${$location}/new`} class="p-0 !no-underline">
                {m['common.create']()}
            </Link>
        </Button>
    </div>
</div>

<AlertDialog open={showModal} onOpenChange={() => (showModal = false)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{batchDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{batchDeleteText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
            <AlertDialogAction onclick={handleDelete}>{m['common.continue']()}</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
