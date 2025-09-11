import vine from '@vinejs/vine';

export const getBlockedUsersValidator = vine.compile(
    vine.object({
        query: vine.string().trim().optional(),
        page: vine.number().positive().optional(),
        limit: vine.number().positive().optional(),
    })
);

export const blockValidator = vine.compile(
    vine.object({
        userId: vine.number().positive(),
    })
);

export const cancelValidator = vine.compile(
    vine.object({
        userId: vine.number().positive(),
    })
);
