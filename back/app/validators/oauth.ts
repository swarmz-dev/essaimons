import vine from '@vinejs/vine';

export const confirmOauthConnectionValidator = vine.compile(
    vine.object({
        provider: vine.string().trim(),
        token: vine.string().trim(),
    })
);
