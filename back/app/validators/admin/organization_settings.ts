import vine from '@vinejs/vine';

export const updateOrganizationSettingsValidator = vine.compile(
    vine.object({
        name: vine.string().trim().maxLength(255).nullable().optional(),
        description: vine.string().trim().maxLength(2000).nullable().optional(),
        sourceCodeUrl: vine.string().trim().maxLength(1024).optional(),
        copyright: vine.string().trim().maxLength(512).nullable().optional(),
        removeLogo: vine.boolean().optional(),
        logo: vine
            .file({
                size: '4mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
    })
);
