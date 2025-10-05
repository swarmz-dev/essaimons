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
        const { numericIds, uuidIds } = this.partitionIdentifiers(associatedIds);

        if (!numericIds.length && !uuidIds.length) {
            return [];
        }

        const query = this.Model.query({ client: trx });
        query.where((builder) => {
            if (numericIds.length) {
                builder.whereIn('front_id', numericIds);
            }
            if (uuidIds.length) {
                if (numericIds.length) {
                    builder.orWhereIn('id', uuidIds);
                } else {
                    builder.whereIn('id', uuidIds);
                }
            }
        });

        return query;
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

        const categoryPartitions = this.partitionIdentifiers(filters.categoryIds ?? []);

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
            .if(categoryPartitions.numericIds.length + categoryPartitions.uuidIds.length > 0, (queryBuilder: ModelQueryBuilderContract<typeof Proposition>): void => {
                queryBuilder.whereHas('categories', (categoryQuery) => {
                    categoryQuery.where((builder) => {
                        if (categoryPartitions.numericIds.length) {
                            builder.whereIn('proposition_categories.front_id', categoryPartitions.numericIds);
                        }
                        if (categoryPartitions.uuidIds.length) {
                            if (categoryPartitions.numericIds.length) {
                                builder.orWhereIn('proposition_categories.id', categoryPartitions.uuidIds);
                            } else {
                                builder.whereIn('proposition_categories.id', categoryPartitions.uuidIds);
                            }
                        }
                    });
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
        const query = this.Model.query();
        const numericValue = Number(identifier);
        if (Number.isFinite(numericValue)) {
            query.where('front_id', Math.floor(numericValue));
        } else {
            query.where('id', identifier);
        }
        preload.forEach((relation) => query.preload(relation));
        return query.first();
    }

    private partitionIdentifiers(rawIds: string[]): { numericIds: number[]; uuidIds: string[] } {
        const numericIds: number[] = [];
        const uuidIds: string[] = [];

        for (const rawId of rawIds ?? []) {
            const trimmed = rawId?.toString().trim();
            if (!trimmed) continue;
            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                numericIds.push(Math.floor(asNumber));
            } else {
                uuidIds.push(trimmed);
            }
        }

        return { numericIds, uuidIds };
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
