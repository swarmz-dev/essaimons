import vine from '@vinejs/vine';

export const sendResetPasswordEmailValidator = vine.compile(
    vine.object({
        email: vine.string().trim().email().maxLength(100),
    })
);

export const resetPasswordValidator = vine.compile(
    vine.object({
        password: vine
            .string()
            .trim()
            .minLength(8)
            .maxLength(100)
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
            .confirmed({ confirmationField: 'confirmPassword' }),
    })
);

export const resetPasswordParamsValidator = vine.compile(
    vine.object({
        token: vine.string().trim(),
    })
);

export const updateProfileValidator = vine.compile(
    vine.object({
        email: vine.string().trim().email().maxLength(100),
        username: vine.string().trim().minLength(3).maxLength(50).alphaNumeric(),
        profilePicture: vine
            .file({
                size: '2mb',
                extnames: ['png', 'jpg', 'gif', 'jpeg', 'webp', 'svg'],
            })
            .optional(),
    })
);
