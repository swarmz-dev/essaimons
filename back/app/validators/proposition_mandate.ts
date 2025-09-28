import vine from '@vinejs/vine';
import { MandateStatusEnum } from '#types/enum/mandate_status_enum';

const baseSchema = {
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(1500).optional(),
    holderUserId: vine.string().trim().optional(),
    status: vine.enum(Object.values(MandateStatusEnum)).optional(),
    targetObjectiveRef: vine.string().trim().maxLength(255).optional(),
    initialDeadline: vine.string().trim().optional(),
    currentDeadline: vine.string().trim().optional(),
};

export const createMandateValidator = vine.compile(vine.object(baseSchema));

export const updateMandateValidator = vine.compile(
    vine.object({
        title: baseSchema.title.optional(),
        description: baseSchema.description,
        holderUserId: baseSchema.holderUserId,
        status: baseSchema.status,
        targetObjectiveRef: baseSchema.targetObjectiveRef,
        initialDeadline: baseSchema.initialDeadline,
        currentDeadline: baseSchema.currentDeadline,
    })
);
