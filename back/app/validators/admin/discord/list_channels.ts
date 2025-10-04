import vine from '@vinejs/vine';

export const listChannelsValidator = vine.compile(
    vine.object({
        guildId: vine.string().trim(),
        botToken: vine.string().trim(),
    })
);
