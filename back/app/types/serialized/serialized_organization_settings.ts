import type { SerializedFile } from './serialized_file.js';

export type SerializedOrganizationSettings = {
    fallbackLocale: string;
    locales: Array<{ code: string; label: string; isDefault: boolean }>;
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
