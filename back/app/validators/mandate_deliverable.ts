import vine from '@vinejs/vine';
import { DeliverableVerdictEnum } from '#types';

export const createMandateDeliverableValidator = vine.compile(
    vine.object({
        label: vine.string().trim().maxLength(255).optional(),
        objectiveRef: vine.string().trim().maxLength(255).optional(),
    })
);

export const evaluateMandateDeliverableValidator = vine.compile(
    vine.object({
        verdict: vine.enum(Object.values(DeliverableVerdictEnum)),
        comment: vine.string().trim().maxLength(2000).optional(),
    })
);
