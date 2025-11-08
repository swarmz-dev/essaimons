import vine from '@vinejs/vine';

export const updateSettingsValidator = vine.compile(
    vine.object({
        inAppEnabled: vine.boolean().optional(),
        emailEnabled: vine.boolean().optional(),
        pushEnabled: vine.boolean().optional(),
        settings: vine
            .object({
                hoursBeforeDeadline: vine.number().min(1).max(168).optional(),
            })
            .optional()
            .nullable(),
    })
);
