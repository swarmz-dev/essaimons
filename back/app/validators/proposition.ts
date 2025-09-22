import vine from '@vinejs/vine';

const isoDateRegex: RegExp = /^\d{4}-\d{2}-\d{2}$/;

export const createPropositionValidator = vine.compile(
    vine.object({
        title: vine.string().trim().minLength(1).maxLength(150),
        summary: vine.string().trim().minLength(1).maxLength(300),
        detailedDescription: vine.string().trim().minLength(1).maxLength(1500),
        smartObjectives: vine.string().trim().minLength(1).maxLength(1500),
        impacts: vine.string().trim().minLength(1).maxLength(1500),
        mandatesDescription: vine.string().trim().minLength(1).maxLength(1500),
        expertise: vine.string().trim().maxLength(150).optional(),
        categoryIds: vine.array(vine.string().trim().minLength(1)).minLength(1),
        associatedPropositionIds: vine.array(vine.string().trim().minLength(1)).optional(),
        rescueInitiatorIds: vine.array(vine.string().trim().minLength(1)).minLength(1),
        clarificationDeadline: vine.string().trim().regex(isoDateRegex),
        improvementDeadline: vine.string().trim().regex(isoDateRegex),
        voteDeadline: vine.string().trim().regex(isoDateRegex),
        mandateDeadline: vine.string().trim().regex(isoDateRegex),
        evaluationDeadline: vine.string().trim().regex(isoDateRegex),
    })
);
