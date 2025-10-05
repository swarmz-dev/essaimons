import BaseRepository from '#repositories/base/base_repository';
import Proposition from '#models/proposition';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations';
import type { PaginatedPropositions } from '#types/paginated/paginated_propositions';

export default class PropositionRepository extends BaseRepository<typeof Proposition> {
    constructor() {
        super(Proposition);
    }

    public async getExistingAssociatedPropositions(associatedIds: string[], trx: TransactionClientContract): Promise<Proposition[]> {
        if (!associatedIds || !associatedIds.length) {
            return [];
        }

        return this.Model.query({ client: trx }).whereIn('id', associatedIds);
    }

    public async searchWithFilters(
        filters: { search?: string; categoryIds?: string[]; statuses?: string[] },
        page: number,
        limit: number,
        sortBy: string = 'created_at',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<PaginatedPropositions> {
        const sanitizedLimit: number = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 12;
        const sanitizedPage: number = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

        // Map camelCase to snake_case for database columns
        const columnMapping: Record<string, string> = {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            voteDeadline: 'vote_deadline',
            mandateDeadline: 'mandate_deadline',
        };
        const dbColumn = columnMapping[sortBy] || sortBy;

        const query = this.Model.query()
            .preload('categories')
            .preload('creator')
            .preload('visual')
            .orderBy(dbColumn, sortOrder)
            .if(filters.search, (queryBuilder: ModelQueryBuilderContract<typeof Proposition>): void => {
                const search = filters.search!.toLowerCase();
                queryBuilder.where((builder) => {
                    builder
                        .whereRaw('LOWER(title) LIKE ?', [`%${search}%`])
                        .orWhereRaw('LOWER(summary) LIKE ?', [`%${search}%`])
                        .orWhereRaw('LOWER(detailed_description) LIKE ?', [`%${search}%`]);
                });
            })
            .if(filters.categoryIds && filters.categoryIds.length > 0, (queryBuilder: ModelQueryBuilderContract<typeof Proposition>): void => {
                queryBuilder.whereHas('categories', (categoryQuery) => {
                    categoryQuery.whereIn('proposition_categories.id', filters.categoryIds!);
                });
            })
            .if(filters.statuses && filters.statuses.length > 0, (queryBuilder: ModelQueryBuilderContract<typeof Proposition>): void => {
                queryBuilder.whereIn('status', filters.statuses!);
            });

        const propositions: ModelPaginatorContract<Proposition> = await query.paginate(sanitizedPage, sanitizedLimit);

        return {
            propositions: propositions.all().map((proposition: Proposition) => proposition.listSerialize()),
            firstPage: propositions.firstPage,
            lastPage: propositions.lastPage,
            limit: propositions.perPage,
            total: propositions.total,
            currentPage: propositions.currentPage,
        };
    }

    public async findByPublicId(identifier: string, preload: ExtractModelRelations<InstanceType<typeof Proposition>>[] = []): Promise<Proposition | null> {
        const query = this.Model.query().where('id', identifier);
        preload.forEach((relation) => query.preload(relation));
        return query.first();
    }

    public async findUserContributions(userId: string, page: number, limit: number): Promise<PaginatedPropositions> {
        const sanitizedLimit: number = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 12;
        const sanitizedPage: number = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

        // Find propositions where user is creator, rescue initiator, or has commented
        const query = this.Model.query()
            .preload('categories')
            .preload('creator')
            .preload('visual')
            .where((builder) => {
                builder
                    // User is creator
                    .where('creator_id', userId)
                    // User is rescue initiator
                    .orWhereHas('rescueInitiators', (rescueQuery) => {
                        rescueQuery.where('users.id', userId);
                    })
                    // User has commented
                    .orWhereHas('comments', (commentQuery) => {
                        commentQuery.where('author_id', userId);
                    });
            })
            .orderBy('updated_at', 'desc');

        const propositions: ModelPaginatorContract<Proposition> = await query.paginate(sanitizedPage, sanitizedLimit);

        return {
            propositions: propositions.all().map((proposition: Proposition) => proposition.listSerialize()),
            firstPage: propositions.firstPage,
            lastPage: propositions.lastPage,
            limit: propositions.perPage,
            total: propositions.total,
            currentPage: propositions.currentPage,
        };
    }
}
