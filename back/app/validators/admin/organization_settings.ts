import vine from '@vinejs/vine';

const translationSchema = vine.record(vine.string().trim().maxLength(2000));

export const updateOrganizationSettingsValidator = vine.compile(
    vine.object({
        fallbackLocale: vine.string().trim().maxLength(10),
        name: translationSchema.optional(),
        description: translationSchema.optional(),
        sourceCodeUrl: translationSchema.optional(),
        copyright: translationSchema.optional(),
        removeLogo: vine.boolean().optional(),
        logo: vine
            .file({
                size: '4mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
    })
);
