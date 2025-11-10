import vine from '@vinejs/vine';

const translationSchema = vine.record(vine.string().trim().maxLength(2000));
const descriptionSchema = vine.record(vine.string().trim().maxLength(10000)); // Higher limit for HTML content
const sourceCodeUrlSchema = vine.record(vine.string().trim().maxLength(2000).url());
const keywordsSchema = vine.record(vine.string().trim().maxLength(500)); // Keywords for SEO
const permissionMatrixSchema = vine.record(vine.record(vine.record(vine.boolean())));

export const updateOrganizationSettingsValidator = vine.compile(
    vine.object({
        defaultLocale: vine.string().trim().maxLength(10).optional(),
        fallbackLocale: vine.string().trim().maxLength(10),
        name: translationSchema.optional(),
        description: descriptionSchema.optional(),
        sourceCodeUrl: sourceCodeUrlSchema.optional(),
        copyright: translationSchema.optional(),
        keywords: keywordsSchema.optional(),
        logo: vine
            .file({
                size: '4mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
        favicon: vine
            .file({
                size: '1mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico'],
            })
            .optional(),
        propositionDefaults: vine
            .object({
                clarificationOffsetDays: vine.number().min(0).max(365).optional(),
                amendmentOffsetDays: vine.number().min(0).max(365).optional(),
                voteOffsetDays: vine.number().min(0).max(365).optional(),
                mandateOffsetDays: vine.number().min(0).max(365).optional(),
                evaluationOffsetDays: vine.number().min(0).max(365).optional(),
            })
            .optional(),
        deadlineReminders: vine
            .object({
                contributorHoursBeforeDeadline: vine.number().min(1).max(168).optional(),
                initiatorHoursBeforeDeadline: vine.number().min(1).max(168).optional(),
            })
            .optional(),
        permissions: vine
            .object({
                perStatus: permissionMatrixSchema.optional(),
            })
            .optional(),
        permissionCatalog: vine
            .object({
                perStatus: permissionMatrixSchema.optional(),
            })
            .optional(),
        workflowAutomation: vine
            .object({
                deliverableRecalcCooldownMinutes: vine.number().min(1).max(1440).optional(),
                evaluationAutoShiftDays: vine.number().min(0).max(365).optional(),
                nonConformityPercentThreshold: vine.number().min(0).max(100).optional(),
                nonConformityAbsoluteFloor: vine.number().min(0).max(1000).optional(),
                revocationAutoTriggerDelayDays: vine.number().min(0).max(365).optional(),
                revocationCheckFrequencyHours: vine.number().min(1).max(168).optional(),
                deliverableNamingPattern: vine.string().trim().maxLength(255).optional(),
            })
            .optional(),
    })
);
