import vine from '@vinejs/vine';

export const castBallotValidator = vine.compile(
    vine.object({
        // Pour vote binaire
        optionId: vine.string().trim().optional(),

        // Pour choix multiple
        optionIds: vine.array(vine.string().trim()).optional(),

        // Pour jugement majoritaire
        ratings: vine.object({}).allowUnknownProperties().optional(),
    })
);
