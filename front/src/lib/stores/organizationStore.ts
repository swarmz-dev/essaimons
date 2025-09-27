import { writable, type Writable } from 'svelte/store';
import type { SerializedFile } from 'backend/types';

export type OrganizationSettings = {
    name: string | null;
    description: string | null;
    sourceCodeUrl: string | null;
    copyright: string | null;
    logo: SerializedFile | null;
};

const defaultSettings: OrganizationSettings = {
    name: null,
    description: null,
    sourceCodeUrl: null,
    copyright: null,
    logo: null,
};

export const organizationSettings: Writable<OrganizationSettings> = writable(defaultSettings);

export function setOrganizationSettings(settings: OrganizationSettings): void {
    organizationSettings.set({
        name: settings.name ?? null,
        description: settings.description ?? null,
        sourceCodeUrl: settings.sourceCodeUrl ?? null,
        copyright: settings.copyright ?? null,
        logo: settings.logo ?? null,
    });
}
