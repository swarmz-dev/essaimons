import BaseRepository from '#repositories/base/base_repository';
import User from '#models/user';
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import type { PaginatedUsers } from '#types/paginated/paginated_users';
import type { SerializedUser } from '#types/serialized/serialized_user';
import { inject } from '@adonisjs/core';
import FileService from '#services/file_service';
import LogUserRepository from '#repositories/log_user_repository';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';

@inject()
export default class UserRepository extends BaseRepository<typeof User> {
    constructor(
        private readonly fileService: FileService,
        private readonly logUserRepository: LogUserRepository
    ) {
        super(User);
    }

    public async getAllOtherUsers(currentUser: User): Promise<User[]> {
        return this.Model.query().whereNot('id', currentUser.id);
    }

    public async getAdminUsers(query: string, page: number, limit: number, sortBy: { field: keyof User['$attributes']; order: 'asc' | 'desc' }): Promise<PaginatedUsers> {
        const users: ModelPaginatorContract<User> = await this.Model.query()
            .if(query, (queryBuilder: ModelQueryBuilderContract<typeof User>): void => {
                queryBuilder.where('username', 'ILIKE', `%${query}%`).orWhere('email', 'ILIKE', `%${query}%`);
            })
            .if(sortBy, (queryBuilder: ModelQueryBuilderContract<typeof User>): void => {
                queryBuilder.orderBy(sortBy.field as string, sortBy.order);
            })
            .paginate(page, limit);

        return {
            users: users.all().map((user: User): SerializedUser => user.apiSerialize()),
            firstPage: users.firstPage,
            lastPage: users.lastPage,
            limit,
            total: users.total,
            currentPage: page,
        };
    }

    public async delete(ids: string[], currentUser: User): Promise<{ isDeleted: boolean; isCurrentUser?: boolean; isAdmin?: boolean; hasActivity?: boolean; username?: string; id: string }[]> {
        // Delete some other things if needed
        return await Promise.all([
            ...ids.map(async (id: string): Promise<{ isDeleted: boolean; isCurrentUser?: boolean; isAdmin?: boolean; hasActivity?: boolean; username?: string; id: string }> => {
                try {
                    const user: User = await this.Model.query().where('id', id).firstOrFail();
                    if (user.id === currentUser.id) {
                        return { isDeleted: false, isCurrentUser: true, username: user.username, id };
                    }

                    // Prevent deletion of admin users
                    if (user.role === 'admin') {
                        return { isDeleted: false, isAdmin: true, username: user.username, id };
                    }

                    // Check for any user activity in the system
                    const { default: Proposition } = await import('#models/proposition');
                    const { default: PropositionComment } = await import('#models/proposition_comment');
                    const { default: PropositionReaction } = await import('#models/proposition_reaction');
                    const { default: VoteBallot } = await import('#models/vote_ballot');
                    const { default: MandateApplication } = await import('#models/mandate_application');
                    const { default: MandateDeliverable } = await import('#models/mandate_deliverable');
                    const { default: DeliverableEvaluation } = await import('#models/deliverable_evaluation');
                    const { default: MandateRevocationRequest } = await import('#models/mandate_revocation_request');

                    // Check for propositions
                    const propositionCount = await Proposition.query().where('creator_id', user.id).count('* as total');
                    if (propositionCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for comments (includes amendments and clarifications)
                    const commentCount = await PropositionComment.query().where('author_id', user.id).count('* as total');
                    if (commentCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for reactions
                    const reactionCount = await PropositionReaction.query().where('user_id', user.id).count('* as total');
                    if (reactionCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for votes
                    const voteCount = await VoteBallot.query().where('voter_id', user.id).count('* as total');
                    if (voteCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for mandate applications
                    const applicationCount = await MandateApplication.query().where('applicant_user_id', user.id).count('* as total');
                    if (applicationCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for deliverables
                    const deliverableCount = await MandateDeliverable.query().where('uploaded_by_user_id', user.id).count('* as total');
                    if (deliverableCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for evaluations
                    const evaluationCount = await DeliverableEvaluation.query().where('evaluator_user_id', user.id).count('* as total');
                    if (evaluationCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    // Check for revocation requests
                    const revocationCount = await MandateRevocationRequest.query().where('initiated_by_user_id', user.id).count('* as total');
                    if (revocationCount[0].$extras.total > 0) {
                        return { isDeleted: false, hasActivity: true, username: user.username, id };
                    }

                    await user.delete();

                    if (user.profilePicture) {
                        await this.fileService.delete(user.profilePicture);
                        await user.profilePicture.delete();
                    }

                    await this.logUserRepository.deleteByUser(user);

                    return { isDeleted: true, username: user.username, id: user.id };
                } catch (error: any) {
                    console.error('Error deleting user:', error);
                    return { isDeleted: false, id };
                }
            }),
        ]);
    }

    public async getRescueUsers(rescueIds: string[], currentUser: User, trx: TransactionClientContract, options: { includeCurrentUser?: boolean } = {}): Promise<User[]> {
        const numericIds: number[] = [];
        const uuidIds: string[] = [];

        for (const rawId of rescueIds ?? []) {
            const trimmed = rawId?.toString().trim();
            if (!trimmed) continue;
            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                numericIds.push(Math.floor(asNumber));
            } else {
                uuidIds.push(trimmed);
            }
        }

        if (!numericIds.length && !uuidIds.length) {
            return [];
        }

        const query = this.Model.query({ client: trx });

        if (!options.includeCurrentUser) {
            query.whereNot('id', currentUser.id);
        }
        if (uuidIds.length) {
            query.whereIn('id', uuidIds);
        }

        return query;
    }
}
