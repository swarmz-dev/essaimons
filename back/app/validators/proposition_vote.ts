import vine from '@vinejs/vine';
import { PropositionVotePhaseEnum, PropositionVoteMethodEnum, PropositionVoteStatusEnum } from '#types';

const voteOptionSchema = vine.object({
    label: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(1000).optional(),
    position: vine.number().optional(),
    metadata: vine.object({}).allowUnknownProperties().optional(),
});

export const createVoteValidator = vine.compile(
    vine.object({
        phase: vine.enum(Object.values(PropositionVotePhaseEnum)),
        method: vine.enum(Object.values(PropositionVoteMethodEnum)),
        title: vine.string().trim().minLength(1).maxLength(255),
        description: vine.string().trim().maxLength(1000).optional(),
        openAt: vine.string().trim().optional(),
        closeAt: vine.string().trim().optional(),
        maxSelections: vine.number().min(0).optional(),
        metadata: vine.object({}).allowUnknownProperties().optional(),
        options: vine.array(voteOptionSchema).minLength(1),
    })
);

export const updateVoteValidator = vine.compile(
    vine.object({
        phase: vine.enum(Object.values(PropositionVotePhaseEnum)).optional(),
        method: vine.enum(Object.values(PropositionVoteMethodEnum)).optional(),
        title: vine.string().trim().minLength(1).maxLength(255).optional(),
        description: vine.string().trim().maxLength(1000).optional(),
        openAt: vine.string().trim().optional(),
        closeAt: vine.string().trim().optional(),
        maxSelections: vine.number().min(0).optional(),
        metadata: vine.object({}).allowUnknownProperties().optional(),
        options: vine.array(voteOptionSchema).minLength(1).optional(),
    })
);

export const changeVoteStatusValidator = vine.compile(
    vine.object({
        status: vine.enum(Object.values(PropositionVoteStatusEnum)),
    })
);
