import vine from '@vinejs/vine';

export const getPendingFriendNotificationsValidator = vine.compile(
    vine.object({
        page: vine.number().positive().optional(),
        limit: vine.number().positive().optional(),
        seen: vine.boolean().optional(),
    })
);
