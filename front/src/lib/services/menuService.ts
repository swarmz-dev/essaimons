import { m } from '#lib/paraglide/messages';
import type { Component } from 'svelte';
import { House, UserPen, LogOut, Lock, User, UsersRound, ChartColumn, ArrowLeftFromLine, FilePlus2, Files, Tags, Building2 } from '@lucide/svelte';

export type MenuItemsListItem = {
    href: string;
    icon: Component;
    title: string;
};

interface MenuItemsList {
    connected: MenuItemsListItem[];
    notConnected: MenuItemsListItem[];
}

export const mainMenu: MenuItemsList = {
    connected: [
        {
            href: '/',
            icon: House,
            title: m['home.title'](),
        },
        {
            href: '/propositions',
            icon: Files,
            title: m['proposition-list.menu'](),
        },
        {
            href: '/propositions/create',
            icon: FilePlus2,
            title: m['proposition-create.menu'](),
        },
        {
            href: '/profile',
            icon: UserPen,
            title: m['profile.title'](),
        },
        {
            href: '/admin',
            icon: Lock,
            title: m['menu.admin'](),
        },
        {
            href: '/logout',
            icon: LogOut,
            title: m['logout.title'](),
        },
    ],
    notConnected: [
        {
            href: '/login',
            icon: User,
            title: m['login.title'](),
        },
        {
            href: '/create-account',
            icon: User,
            title: m['create-account.title'](),
        },
    ],
};

export const adminMenu: MenuItemsListItem[] = [
    {
        href: '/',
        icon: ArrowLeftFromLine,
        title: m['home.title'](),
    },
    {
        href: '/admin',
        icon: ChartColumn,
        title: m['admin.title'](),
    },
    {
        href: '/admin/user',
        icon: UsersRound,
        title: m['admin.user.title'](),
    },
    {
        href: '/admin/categories',
        icon: Tags,
        title: m['admin.categories.title'](),
    },
    {
        href: '/admin/organization',
        icon: Building2,
        title: m['admin.organization.title'](),
    },
];
