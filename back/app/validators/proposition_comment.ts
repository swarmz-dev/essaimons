import vine from '@vinejs/vine';
import { PropositionCommentScopeEnum, PropositionCommentVisibilityEnum } from '#types';

export const createCommentValidator = vine.compile(
    vine.object({
        scope: vine.enum(Object.values(PropositionCommentScopeEnum)),
        visibility: vine.enum(Object.values(PropositionCommentVisibilityEnum)).optional(),
        content: vine.string().trim().minLength(1).maxLength(2000),
        parentId: vine.string().trim().optional(),
    })
);

export const updateCommentValidator = vine.compile(
    vine.object({
        content: vine.string().trim().minLength(1).maxLength(2000),
    })
);
