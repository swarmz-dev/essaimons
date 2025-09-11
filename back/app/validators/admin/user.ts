import vine from '@vinejs/vine';
import { sortByUserRule } from '#validators/admin/custom/user';

export const searchAdminUsersValidator = vine.compile(
    vine.object({
        query: vine.string().trim().maxLength(50),
        page: vine.number().positive(),
        limit: vine.number().positive(),
        sortBy: vine.string().trim().use(sortByUserRule()),
    })
);

export const deleteUsersValidator = vine.compile(
    vine.object({
        users: vine.array(vine.number()),
    })
);

export const createUserValidator = vine.compile(
    vine.object({
        username: vine.string().trim().minLength(3).maxLength(50).alphaNumeric(),
        email: vine.string().trim().maxLength(100).email(),
        profilePicture: vine
            .file({
                size: '2mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
    })
);

export const getAdminUserValidator = vine.compile(
    vine.object({
        frontId: vine.number(),
    })
);

export const updateUserValidator = vine.compile(
    vine.object({
        username: vine.string().trim().minLength(3).maxLength(50).alphaNumeric(),
        email: vine.string().trim().maxLength(100).email(),
        profilePicture: vine
            .file({
                size: '2mb',
                extnames: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
    })
);
