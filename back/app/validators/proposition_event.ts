import vine from '@vinejs/vine';
import { PropositionEventTypeEnum } from '#types/enum/proposition_event_type_enum';

export const createEventValidator = vine.compile(
    vine.object({
        type: vine.enum(Object.values(PropositionEventTypeEnum)),
        title: vine.string().trim().minLength(1).maxLength(255),
        description: vine.string().trim().maxLength(1000).optional(),
        startAt: vine.string().trim().optional(),
        endAt: vine.string().trim().optional(),
        location: vine.string().trim().maxLength(255).optional(),
        videoLink: vine.string().trim().maxLength(255).optional(),
    })
);

export const updateEventValidator = vine.compile(
    vine.object({
        type: vine.enum(Object.values(PropositionEventTypeEnum)).optional(),
        title: vine.string().trim().minLength(1).maxLength(255).optional(),
        description: vine.string().trim().maxLength(1000).optional(),
        startAt: vine.string().trim().optional(),
        endAt: vine.string().trim().optional(),
        location: vine.string().trim().maxLength(255).optional(),
        videoLink: vine.string().trim().maxLength(255).optional(),
    })
);
