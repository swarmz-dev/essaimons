import vine from '@vinejs/vine';
import { sortByLanguageRule } from '#validators/admin/custom/language';

export const searchAdminLanguagesValidator = vine.compile(
    vine.object({
        query: vine.string().trim().maxLength(50),
        page: vine.number().positive(),
        limit: vine.number().positive(),
        sortBy: vine.string().trim().use(sortByLanguageRule()),
    })
);

export const deleteLanguagesValidator = vine.compile(
    vine.object({
        languages: vine.array(vine.string().fixedLength(2).toLowerCase()),
    })
);

export const createLanguageValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(3).maxLength(50),
        code: vine.string().trim().fixedLength(2).toLowerCase(),
        flag: vine.file({
            size: '2mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
        }),
    })
);

export const getAdminLanguageValidator = vine.compile(
    vine.object({
        languageCode: vine.string().trim().fixedLength(2).toLowerCase(),
    })
);

export const updateLanguageValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(3).maxLength(50),
        code: vine.string().trim().fixedLength(2).toLowerCase(),
        flag: vine.file({
            size: '2mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
        }),
    })
);
