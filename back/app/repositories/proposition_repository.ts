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

    public async getExistingAssociatedPropositions(associatedIds: number[], trx: TransactionClientContract): Promise<Proposition[]> {
        return this.Model.query({ client: trx }).whereIn('front_id', associatedIds);
    }

    public async searchWithFilters(filters: { search?: string; categoryIds?: number[] }, page: number, limit: number): Promise<PaginatedPropositions> {
        const sanitizedLimit: number = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 12;
        const sanitizedPage: number = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

        const query = this.Model.query()
            .preload('categories')
            .preload('creator')
            .preload('visual')
            .orderBy('created_at', 'desc')
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
                    categoryQuery.whereIn('proposition_categories.front_id', filters.categoryIds!);
                });
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

    public async findByFrontId(frontId: number, preload: ExtractModelRelations<InstanceType<typeof Proposition>>[] = []): Promise<Proposition | null> {
        const query = this.Model.query().where('front_id', frontId);
        preload.forEach((relation) => query.preload(relation));
        return query.first();
    }
}
