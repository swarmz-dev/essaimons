import { writable, type Writable } from 'svelte/store';
import type { SerializedFile } from 'backend/types';

export type OrganizationLocale = {
    code: string;
    label: string;
    isDefault: boolean;
};

export type OrganizationSettings = {
    fallbackLocale: string;
    locales: OrganizationLocale[];
    name: Record<string, string>;
    description: Record<string, string>;
    sourceCodeUrl: Record<string, string>;
    copyright: Record<string, string>;
    logo: SerializedFile | null;
};

const defaultSettings: OrganizationSettings = {
    fallbackLocale: 'en',
    locales: [],
    name: {},
    description: {},
    sourceCodeUrl: {},
    copyright: {},
    logo: null,
};

export const organizationSettings: Writable<OrganizationSettings> = writable(defaultSettings);

export function setOrganizationSettings(settings: OrganizationSettings): void {
    organizationSettings.set({
        fallbackLocale: settings.fallbackLocale,
        locales: settings.locales ?? [],
        name: settings.name ?? {},
        description: settings.description ?? {},
        sourceCodeUrl: settings.sourceCodeUrl ?? {},
        copyright: settings.copyright ?? {},
        logo: settings.logo ?? null,
    });
}

export function translateField(translations: Record<string, string>, locale: string, fallback: string): string | null {
    const direct = translations[locale]?.trim();
    if (direct) {
        return direct;
    }
    const fallbackValue = translations[fallback]?.trim();
    if (fallbackValue) {
        return fallbackValue;
    }
    const first = Object.values(translations).find((value) => value?.trim().length);
    return first ? first.trim() : null;
}
