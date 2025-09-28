import vine from '@vinejs/vine';

const translationSchema = vine.record(vine.string().trim().maxLength(2000));
const sourceCodeUrlSchema = vine.record(vine.string().trim().maxLength(2000).url());

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
        permissions: vine.record(vine.record(vine.boolean())).optional(),
    })
);
