import vine from '@vinejs/vine';

export const createDiscordEventValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1).maxLength(100),
        startTime: vine.string().trim(),
        endTime: vine.string().trim().optional(),
        description: vine.string().trim().optional(),
        channelId: vine.string().trim().optional(),
    })
);
