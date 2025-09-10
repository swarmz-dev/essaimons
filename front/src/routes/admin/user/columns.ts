import type { ColumnDef } from '@tanstack/table-core';
import { m } from '#lib/paraglide/messages';
import type { SerializedUser } from 'backend/types';
import { renderComponent } from '#lib/components/ui/data-table/render-helpers';
import { Checkbox } from '#lib/components/ui/checkbox';
import { SortableColumn, DataTableActions } from '#lib/components/ui/data-table';
import DatatableProfilePicture from './datatable-profile-picture.svelte';

export const getUserColumns = (onSort: (field: string, order: 'asc' | 'desc') => void, onDelete: (ids: string[] | number[]) => void): ColumnDef<SerializedUser>[] => [
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
        id: 'email',
        accessorKey: 'email',
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.user.fields.email'](),
                field: 'email',
                onclick: onSort,
            }),
        enableHiding: false,
    },
    {
        header: m['admin.user.fields.profile-picture'](),
        meta: {
            headerName: m['admin.user.fields.profile-picture'](),
        },
        cell: ({ row }) =>
            renderComponent(DatatableProfilePicture, {
                user: row.original,
            }),
    },
    {
        id: 'username',
        accessorKey: 'username',
        meta: {
            headerName: m['admin.user.fields.username'](),
        },
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.user.fields.username'](),
                field: 'username',
                onclick: onSort,
            }),
    },
    {
        id: 'enabled',
        accessorKey: 'enabled',
        meta: {
            headerName: m['admin.user.fields.enabled'](),
        },
        header: ({ column }) =>
            renderComponent(SortableColumn, {
                title: m['admin.user.fields.enabled'](),
                field: 'enabled',
                onclick: onSort,
            }),
    },
    {
        header: m['admin.datatable.actions'](),
        enableHiding: false,
        cell: ({ row }) =>
            renderComponent(DataTableActions, {
                id: row.original.id,
                onDelete,
                deleteTitle: m['admin.user.delete.title']({ users: row.original.email }),
                deleteText: m['admin.user.delete.text']({ users: row.original.email, count: 1 }),
            }),
    },
];
