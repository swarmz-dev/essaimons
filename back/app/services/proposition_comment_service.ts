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
        return proposition
            .related('comments')
            .query()
            .preload('author', (query) => query.select(['id', 'front_id', 'username', 'profile_picture_id']))
            .preload('replies', (replyQuery) => {
                replyQuery.preload('author', (query) => query.select(['id', 'front_id', 'username', 'profile_picture_id'])).orderBy('created_at', 'asc');
            })
            .orderBy('created_at', 'asc');
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

        await comment.load('author', (query) => query.select(['id', 'front_id', 'username', 'profile_picture_id']));
        return comment;
    }

    public async update(proposition: Proposition, comment: PropositionComment, actor: User, payload: UpdateCommentPayload): Promise<PropositionComment> {
        const trimmed = payload.content?.trim();
        if (!trimmed) {
            throw new Error('comments.content.empty');
        }

        if (comment.authorId !== actor.id) {
            const allowed = await this.workflowService.canPerform(proposition, actor, 'manage_comments');
            if (!allowed) {
                throw new Error('forbidden:comments');
            }
        }

        comment.content = trimmed;
        await comment.save();
        await comment.load('author', (query) => query.select(['id', 'front_id', 'username', 'profile_picture_id']));
        await comment.load('replies', (replyQuery) => {
            replyQuery.preload('author', (query) => query.select(['id', 'front_id', 'username', 'profile_picture_id'])).orderBy('created_at', 'asc');
        });
        return comment;
    }

    public async delete(proposition: Proposition, comment: PropositionComment, actor: User): Promise<void> {
        if (comment.authorId !== actor.id) {
            const allowed = await this.workflowService.canPerform(proposition, actor, 'manage_comments');
            if (!allowed) {
                throw new Error('forbidden:comments');
            }
        }
        const repliesCount = await comment.related('replies').query().count('* as total');
        const total = Number(repliesCount[0]?.total ?? 0);
        if (total > 0) {
            throw new Error('comments.delete.has-children');
        }
        await comment.delete();
    }

    private async ensureCanComment(proposition: Proposition, actor: User, scope: PropositionCommentScopeEnum): Promise<void> {
        const actionKey = this.actionForScope(scope);
        const allowed = await this.workflowService.canPerform(proposition, actor, actionKey);
        if (!allowed) {
            throw new Error('forbidden:comments');
        }
    }

    private actionForScope(scope: PropositionCommentScopeEnum): string {
        switch (scope) {
            case PropositionCommentScopeEnum.AMENDMENT:
                return 'comment_amendment';
            case PropositionCommentScopeEnum.EVALUATION:
                return 'comment_evaluation';
            case PropositionCommentScopeEnum.MANDATE:
                return 'comment_mandate';
            case PropositionCommentScopeEnum.CLARIFICATION:
            default:
                return 'comment_clarification';
        }
    }
}
