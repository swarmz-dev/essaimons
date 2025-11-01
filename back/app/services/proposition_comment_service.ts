import { inject } from '@adonisjs/core';
import Proposition from '#models/proposition';
import PropositionComment from '#models/proposition_comment';
import type User from '#models/user';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import PropositionNotificationService from '#services/proposition_notification_service';
import { PropositionCommentScopeEnum, PropositionCommentVisibilityEnum } from '#types';
import logger from '@adonisjs/core/services/logger';

interface CreateCommentPayload {
    scope: PropositionCommentScopeEnum;
    section?: string;
    visibility?: PropositionCommentVisibilityEnum;
    content: string;
    parentId?: string | null;
}

interface UpdateCommentPayload {
    content: string;
}

@inject()
export default class PropositionCommentService {
    constructor(
        private readonly workflowService: PropositionWorkflowService,
        private readonly propositionNotificationService: PropositionNotificationService
    ) {}

    public async list(proposition: Proposition, includeHidden: boolean = false): Promise<PropositionComment[]> {
        return proposition
            .related('comments')
            .query()
            .if(!includeHidden, (query) => query.where('is_hidden', false))
            .preload('author', (query) => query.select(['id', 'username', 'profile_picture_id']))
            .preload('replies', (replyQuery) => {
                if (!includeHidden) {
                    replyQuery.where('is_hidden', false);
                }
                replyQuery.preload('author', (query) => query.select(['id', 'username', 'profile_picture_id'])).orderBy('created_at', 'asc');
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
            section: payload.section || null,
            visibility: payload.visibility ?? PropositionCommentVisibilityEnum.PUBLIC,
            content: normalizedContent,
        });

        await comment.load('author', (query) => query.select(['id', 'username', 'profile_picture_id']));

        // Send notification for new comment
        this.propositionNotificationService.notifyCommentAdded(proposition, comment, actor.id).catch((error: Error) => {
            logger.error({ err: error, commentId: comment.id }, 'Failed to send comment notification');
        });

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
        await comment.load('author', (query) => query.select(['id', 'username', 'profile_picture_id']));
        await comment.load('replies', (replyQuery) => {
            replyQuery.preload('author', (query) => query.select(['id', 'username', 'profile_picture_id'])).orderBy('created_at', 'asc');
        });

        // Send notification for comment update
        this.propositionNotificationService.notifyCommentUpdated(proposition, comment, actor.id).catch((error: Error) => {
            logger.error({ err: error, commentId: comment.id }, 'Failed to send comment update notification');
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

        const repliesCount = (await comment.related('replies').query().count('* as total')) as unknown as { total?: string | number }[];
        const total = Number(repliesCount?.[0]?.total ?? 0);
        if (total > 0) {
            throw new Error('comments.delete.has-children');
        }

        // Send notification before deleting
        await this.propositionNotificationService.notifyCommentDeleted(proposition, comment).catch((error: Error) => {
            logger.error({ err: error, commentId: comment.id }, 'Failed to send comment delete notification');
        });

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
