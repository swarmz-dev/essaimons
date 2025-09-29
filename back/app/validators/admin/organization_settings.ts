import vine from '@vinejs/vine';

const translationSchema = vine.record(vine.string().trim().maxLength(2000));
const sourceCodeUrlSchema = vine.record(vine.string().trim().maxLength(2000).url());
const permissionMatrixSchema = vine.record(vine.record(vine.record(vine.boolean())));

export const updateOrganizationSettingsValidator = vine.compile(
    vine.object({
        fallbackLocale: vine.string().trim().maxLength(10),
        name: translationSchema.optional(),
        description: translationSchema.optional(),
        sourceCodeUrl: sourceCodeUrlSchema.optional(),
        copyright: translationSchema.optional(),
        logo: vine
            .file({
                size: '4mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
        propositionDefaults: vine
            .object({
                clarificationOffsetDays: vine.number().min(0).max(365).optional(),
                improvementOffsetDays: vine.number().min(0).max(365).optional(),
                voteOffsetDays: vine.number().min(0).max(365).optional(),
                mandateOffsetDays: vine.number().min(0).max(365).optional(),
                evaluationOffsetDays: vine.number().min(0).max(365).optional(),
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
