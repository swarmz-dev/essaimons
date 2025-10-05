import vine from '@vinejs/vine';

export const getEmailTemplateValidator = vine.compile(
    vine.object({
        id: vine.string().uuid(),
    })
);

export const createEmailTemplateValidator = vine.compile(
    vine.object({
        key: vine.string().trim().minLength(1).maxLength(100),
        name: vine.string().trim().minLength(1).maxLength(255),
        description: vine.string().trim().maxLength(1000).optional(),
        subjects: vine.object({
            en: vine.string().trim().minLength(1).maxLength(500),
            fr: vine.string().trim().minLength(1).maxLength(500),
        }),
        htmlContents: vine.object({
            en: vine.string().trim().minLength(1),
            fr: vine.string().trim().minLength(1),
        }),
        textContents: vine
            .object({
                en: vine.string().trim().optional(),
                fr: vine.string().trim().optional(),
            })
            .optional(),
        isActive: vine.boolean().optional(),
    })
);

export const updateEmailTemplateValidator = vine.compile(
    vine.object({
        key: vine.string().trim().minLength(1).maxLength(100).optional(),
        name: vine.string().trim().minLength(1).maxLength(255).optional(),
        description: vine.string().trim().maxLength(1000).optional(),
        subjects: vine
            .object({
                en: vine.string().trim().minLength(1).maxLength(500).optional(),
                fr: vine.string().trim().minLength(1).maxLength(500).optional(),
            })
            .optional(),
        htmlContents: vine
            .object({
                en: vine.string().trim().minLength(1).optional(),
                fr: vine.string().trim().minLength(1).optional(),
            })
            .optional(),
        textContents: vine
            .object({
                en: vine.string().trim().optional(),
                fr: vine.string().trim().optional(),
            })
            .optional(),
        isActive: vine.boolean().optional(),
    })
);
