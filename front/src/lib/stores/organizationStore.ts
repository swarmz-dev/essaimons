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
    propositionDefaults: {
        clarificationOffsetDays: number;
        improvementOffsetDays: number;
        voteOffsetDays: number;
        mandateOffsetDays: number;
        evaluationOffsetDays: number;
    };
    permissions: {
        perStatus: Record<string, Record<string, boolean>>;
    };
    workflowAutomation: {
        nonConformityThreshold: number;
        evaluationAutoShiftDays: number;
        revocationAutoTriggerDelayDays: number;
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
    workflowAutomation: {
        nonConformityThreshold: 60,
        evaluationAutoShiftDays: 14,
        revocationAutoTriggerDelayDays: 30,
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
