import vine from '@vinejs/vine';

export const updateDiscordSettingsValidator = vine.compile(
    vine.object({
        enabled: vine.boolean(),
        botToken: vine.string().trim().optional(),
        guildId: vine.string().trim().optional(),
        defaultChannelId: vine.string().trim().optional(),
    })
);
