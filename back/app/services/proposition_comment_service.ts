import { inject } from '@adonisjs/core';
import Proposition from '#models/proposition';
import PropositionComment from '#models/proposition_comment';
import type User from '#models/user';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import { PropositionCommentScopeEnum, PropositionCommentVisibilityEnum } from '#types';

interface CreateCommentPayload {
    scope: PropositionCommentScopeEnum;
    visibility?: PropositionCommentVisibilityEnum;
    content: string;
    parentId?: string | null;
}

interface UpdateCommentPayload {
    content: string;
}

@inject()
export default class PropositionCommentService {
    constructor(private readonly workflowService: PropositionWorkflowService) {}

    public async list(proposition: Proposition): Promise<PropositionComment[]> {
        return proposition.related('comments').query().preload('replies').preload('author').orderBy('created_at', 'asc');
    }

    public async create(proposition: Proposition, actor: User, payload: CreateCommentPayload): Promise<PropositionComment> {
        await this.ensureCanComment(proposition, actor, payload.scope);

        const normalizedContent = payload.content?.trim();
        if (!normalizedContent) {
            throw new Error('comments.content.empty');
        }

        const comment = await PropositionComment.create({
            propositionId: proposition.id,
            parentId: payload.parentId ?? null,
            authorId: actor.id,
            scope: payload.scope,
            visibility: payload.visibility ?? PropositionCommentVisibilityEnum.PUBLIC,
            content: normalizedContent,
        });

        await comment.load('author');
        return comment;
    }

    public async update(proposition: Proposition, comment: PropositionComment, actor: User, payload: UpdateCommentPayload): Promise<PropositionComment> {
        const trimmed = payload.content?.trim();
        if (!trimmed) {
            throw new Error('comments.content.empty');
        }

        const role = await this.workflowService.resolveActorRole(proposition, actor);
        if (comment.authorId !== actor.id && role !== 'admin' && role !== 'initiator') {
            throw new Error('forbidden:comments');
        }

        comment.content = trimmed;
        await comment.save();
        return comment;
    }

    public async delete(proposition: Proposition, comment: PropositionComment, actor: User): Promise<void> {
        const role = await this.workflowService.resolveActorRole(proposition, actor);
        if (comment.authorId !== actor.id && role !== 'admin' && role !== 'initiator') {
            throw new Error('forbidden:comments');
        }
        await comment.related('replies').query().delete();
        await comment.delete();
    }

    private async ensureCanComment(proposition: Proposition, actor: User, scope: PropositionCommentScopeEnum): Promise<void> {
        const role = await this.workflowService.resolveActorRole(proposition, actor);
        if (role === 'admin' || role === 'initiator') {
            return;
        }

        if (role === 'mandated' && scope === PropositionCommentScopeEnum.EVALUATION) {
            return;
        }

        if (scope === PropositionCommentScopeEnum.CLARIFICATION || scope === PropositionCommentScopeEnum.AMENDMENT) {
            return;
        }

        throw new Error('forbidden:comments');
    }
}
