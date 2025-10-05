import vine from '@vinejs/vine';

export const updateSettingsValidator = vine.compile(
    vine.object({
        inAppEnabled: vine.boolean().optional(),
        emailEnabled: vine.boolean().optional(),
        pushEnabled: vine.boolean().optional(),
    })
);
