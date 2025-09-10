import vine from '@vinejs/vine';

export const searchPendingFriendsValidator = vine.compile(
    vine.object({
        query: vine.string().trim().optional(),
        page: vine.number().positive().optional(),
        limit: vine.number().positive().optional(),
    })
);

export const addPendingFriendValidator = vine.compile(
    vine.object({
        userId: vine.number().positive(),
    })
);

export const cancelPendingFriendValidator = vine.compile(
    vine.object({
        userId: vine.number().positive(),
    })
);
