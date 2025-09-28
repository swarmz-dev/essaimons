import vine from '@vinejs/vine';
import { PropositionStatusEnum } from '#types/enum/proposition_status_enum';

export const updatePropositionStatusValidator = vine.compile(
    vine.object({
        status: vine.enum(Object.values(PropositionStatusEnum)),
        reason: vine.string().trim().maxLength(500).optional(),
    })
);
