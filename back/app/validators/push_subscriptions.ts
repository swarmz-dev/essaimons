import vine from '@vinejs/vine';

export const subscribeValidator = vine.compile(
    vine.object({
        endpoint: vine.string().trim().url(),
        keys: vine.object({
            p256dh: vine.string().trim(),
            auth: vine.string().trim(),
        }),
    })
);
