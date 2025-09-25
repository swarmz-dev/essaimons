import vine from '@vinejs/vine';

export const createAdminCategoryValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1).maxLength(150),
    })
);

export const updateAdminCategoryValidator = vine.compile(
    vine.object({
        id: vine.string().trim().minLength(1),
        name: vine.string().trim().minLength(1).maxLength(150),
    })
);

export const deleteAdminCategoryValidator = vine.compile(
    vine.object({
        id: vine.string().trim().minLength(1),
    })
);
