import type { SerializedFile } from './serialized_file.js';

export type SerializedStatusPermissions = Record<string, Record<string, Record<string, boolean>>>;

export type JobScheduleConfig = {
    enabled: boolean;
    intervalHours?: number;
    intervalMinutes?: number;
};

export type SerializedOrganizationSettings = {
    defaultLocale: string;
    fallbackLocale: string;
    locales: Array<{ code: string; label: string; isDefault: boolean }>;
    name: Record<string, string>;
    description: Record<string, string>;
    sourceCodeUrl: Record<string, string>;
    copyright: Record<string, string>;
    logo: SerializedFile | null;
    propositionDefaults: {
        clarificationOffsetDays: number;
        amendmentOffsetDays: number;
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
    schedulingPaused?: boolean;
    jobSchedules?: Record<string, JobScheduleConfig>;
};
