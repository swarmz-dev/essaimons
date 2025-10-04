import vine from '@vinejs/vine';
import { PropositionStatusEnum } from '#types/enum/proposition_status_enum';

const isoDateRegex: RegExp = /^\d{4}-\d{2}-\d{2}$/;

const propositionPayloadSchema = vine.object({
    title: vine.string().trim().minLength(1).maxLength(150),
    summary: vine.string().trim().minLength(1).maxLength(600),
    detailedDescription: vine.string().trim().minLength(1).maxLength(1500),
    smartObjectives: vine.string().trim().minLength(1).maxLength(1500),
    impacts: vine.string().trim().minLength(1).maxLength(1500),
    mandatesDescription: vine.string().trim().minLength(1).maxLength(1500),
    expertise: vine.string().trim().maxLength(150).optional(),
    categoryIds: vine.array(vine.string().trim().minLength(1)),
    associatedPropositionIds: vine.array(vine.string().trim().minLength(1)).optional(),
    rescueInitiatorIds: vine.array(vine.string().trim().minLength(1)),
    clarificationDeadline: vine.string().trim().regex(isoDateRegex),
    amendmentDeadline: vine.string().trim().regex(isoDateRegex),
    voteDeadline: vine.string().trim().regex(isoDateRegex),
    mandateDeadline: vine.string().trim().regex(isoDateRegex),
    evaluationDeadline: vine.string().trim().regex(isoDateRegex),
    isDraft: vine.boolean().optional(),
});

export const searchPropositionsValidator = vine.compile(
    vine.object({
        query: vine.string().trim().maxLength(50).optional(),
        page: vine.number().positive().optional(),
        limit: vine.number().positive().optional(),
        categoryIds: vine.array(vine.string().trim()).optional(),
        statuses: vine.array(vine.enum(Object.values(PropositionStatusEnum))).optional(),
    })
);

export const createPropositionValidator = vine.compile(propositionPayloadSchema);
export const updatePropositionValidator = vine.compile(propositionPayloadSchema);
