import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionCommentService from '#services/proposition_comment_service';
import PropositionComment from '#models/proposition_comment';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { createCommentValidator, updateCommentValidator } from '#validators/proposition_comment';

@inject()
export default class PropositionCommentController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly commentService: PropositionCommentService
    ) {}

    public async index({ request, response, user }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const comments = await this.commentService.list(proposition);
        const actor = (user ?? null) as User | null;
        const formatted = comments.map((comment) => this.serializeComment(comment, actor));
        return response.ok({ comments: formatted });
    }

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        try {
            const payload = await createCommentValidator.validate(request.all());
            const created = await this.commentService.create(proposition, user as User, payload);
            return response.created({ comment: this.serializeComment(created, user as User) });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to comment on this proposition' });
            }
            logger.error('proposition.comments.create.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to create comment' });
        }
    }

    public async update(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const comment = await this.findComment(proposition, request.param('commentId'), response);
        if (!comment) return;

        try {
            const payload = await updateCommentValidator.validate(request.all());
            const updated = await this.commentService.update(proposition, comment, user as User, payload);
            return response.ok({ comment: this.serializeComment(updated, user as User) });
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to edit this comment' });
            }
            logger.error('proposition.comments.update.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to update comment' });
        }
    }

    public async destroy(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const comment = await this.findComment(proposition, request.param('commentId'), response);
        if (!comment) return;

        try {
            await this.commentService.delete(proposition, comment, user as User);
            return response.noContent();
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: 'You are not allowed to delete this comment' });
            }
            logger.error('proposition.comments.delete.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to delete comment' });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']): Promise<Proposition | null> {
        if (!param || typeof param !== 'string' || param.trim().length === 0) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }
        const proposition = await this.propositionRepository.findByPublicId(param.trim(), ['comments']);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }

    private async findComment(proposition: Proposition, commentId: string, response: HttpContext['response']): Promise<PropositionComment | null> {
        if (!commentId) {
            response.badRequest({ error: 'Invalid comment id' });
            return null;
        }
        const comment = await PropositionComment.find(commentId);
        if (!comment || comment.propositionId !== proposition.id) {
            response.notFound({ error: 'Comment not found' });
            return null;
        }
        return comment;
    }

    private serializeComment(comment: PropositionComment, actor: User | null): any {
        const json = comment.toJSON();
        const editable = !!actor && comment.authorId === actor.id;
        const replies = (json.replies ?? []).map((reply: any) => ({
            ...reply,
            editable: !!actor && reply.authorId === actor.id,
        }));
        return {
            ...json,
            editable,
            replies,
        };
    }
}
