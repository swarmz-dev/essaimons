import vine from '@vinejs/vine';

export const castBallotValidator = vine.compile(
    vine.object({
        // For binary vote
        optionId: vine.string().trim().optional(),

        // For multiple choice
        optionIds: vine.array(vine.string().trim()).optional(),

        // For majority judgment
        ratings: vine.object({}).allowUnknownProperties().optional(),
    })
);
