import vine from '@vinejs/vine';

export const queryStringAccessTokenValidator = vine.compile(
    vine.object({
        token: vine.string().trim().startsWith('oat_'),
    })
);

export const transmitAccessTokenValidator = vine.compile(
    vine.object({
        token: vine.string().trim().startsWith('oat_'),
    })
);
