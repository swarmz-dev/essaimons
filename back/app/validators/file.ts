import vine from '@vinejs/vine';

export const serveStaticProfilePictureFileValidator = vine.compile(
    vine.object({
        userId: vine.number().positive(),
    })
);

export const serveStaticLanguageFlagFileValidator = vine.compile(
    vine.object({
        languageCode: vine.string().fixedLength(2).toLowerCase(),
    })
);
