import type { ColumnDef } from '@tanstack/table-core';
import { m } from '#lib/paraglide/messages';
import type { SerializedLanguage } from 'backend/types';
import { renderComponent } from '#lib/components/ui/data-table/render-helpers';
import { Checkbox } from '#lib/components/ui/checkbox';
import { SortableColumn, DataTableActions } from '#lib/components/ui/data-table';
import DatatableLanguageIcon from './datatable-language-icon.svelte';

export const getLanguageColumns = (onSort: (field: string, order: 'asc' | 'desc') => void, onDelete: (ids: string[]) => void): ColumnDef<SerializedLanguage>[] => [
    {
        id: 'select',
        header: ({ table }) =>
            renderComponent(Checkbox, {
                checked: table.getIsAllPageRowsSelected(),
                indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
                onCheckedChange: (value: boolean): void => table.toggleAllPageRowsSelected(value),
                'aria-label': m['admin.datatable.select.all'](),
            }),
        cell: ({ row }) =>
            renderComponent(Checkbox, {
                checked: row.getIsSelected(),
                'aria-label': m['admin.datatable.select.row'](),
            }),
        enableHiding: false,
    },
    {
        id: 'code',
        accessorKey: 'code',
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.language.fields.code'](),
                field: 'code',
                onclick: onSort,
            }),
        enableHiding: false,
    },
    {
        header: m['admin.language.fields.flag'](),
        meta: {
            headerName: m['admin.language.fields.flag'](),
        },
        cell: ({ row }) =>
            renderComponent(DatatableLanguageIcon, {
                language: row.original,
            }),
    },
    {
        id: 'name',
        accessorKey: 'name',
        meta: {
            headerName: m['admin.language.fields.name'](),
        },
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.language.fields.name'](),
                field: 'name',
                onclick: onSort,
            }),
    },
    {
        id: 'fallback',
        accessorKey: 'isFallback',
        meta: {
            headerName: m['admin.language.fields.fallback'](),
        },
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.language.fields.fallback'](),
                field: 'isFallback',
                onclick: onSort,
            }),
    },
    {
        header: m['admin.datatable.actions'](),
        enableHiding: false,
        cell: ({ row }) =>
            renderComponent(DataTableActions, {
                id: row.original.code,
                onDelete,
                deleteTitle: m['admin.language.delete.title']({ languages: row.original.name }),
                deleteText: m['admin.language.delete.text']({ languages: row.original.name, count: 1 }),
            }),
    },
];
