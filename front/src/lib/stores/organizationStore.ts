import { writable, type Writable } from 'svelte/store';
import type { SerializedFile, SerializedStatusPermissions } from 'backend/types';

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
    propositionDefaults: {
        clarificationOffsetDays: number;
        improvementOffsetDays: number;
        voteOffsetDays: number;
        mandateOffsetDays: number;
        evaluationOffsetDays: number;
    };
    permissions: {
        perStatus: SerializedStatusPermissions;
    };
    permissionCatalog: {
        perStatus: SerializedStatusPermissions;
    };
    workflowAutomation: {
        deliverableRecalcCooldownMinutes: number;
        evaluationAutoShiftDays: number;
        nonConformityPercentThreshold: number;
        nonConformityAbsoluteFloor: number;
        revocationAutoTriggerDelayDays: number;
        revocationCheckFrequencyHours: number;
        deliverableNamingPattern: string;
    };
};

const defaultSettings: OrganizationSettings = {
    fallbackLocale: 'en',
    locales: [],
    name: {},
    description: {},
    sourceCodeUrl: {},
    copyright: {},
    logo: null,
    propositionDefaults: {
        clarificationOffsetDays: 7,
        improvementOffsetDays: 15,
        voteOffsetDays: 7,
        mandateOffsetDays: 15,
        evaluationOffsetDays: 30,
    },
    permissions: { perStatus: {} },
    permissionCatalog: { perStatus: {} },
    workflowAutomation: {
        deliverableRecalcCooldownMinutes: 10,
        evaluationAutoShiftDays: 14,
        nonConformityPercentThreshold: 10,
        nonConformityAbsoluteFloor: 5,
        revocationAutoTriggerDelayDays: 7,
        revocationCheckFrequencyHours: 24,
        deliverableNamingPattern: 'DELIV-{proposition}-{date}',
    },
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
        propositionDefaults: settings.propositionDefaults ?? defaultSettings.propositionDefaults,
        permissions: settings.permissions ?? defaultSettings.permissions,
        permissionCatalog: settings.permissionCatalog ?? defaultSettings.permissionCatalog,
        workflowAutomation: settings.workflowAutomation ?? defaultSettings.workflowAutomation,
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
