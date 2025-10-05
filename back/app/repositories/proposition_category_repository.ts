import BaseRepository from '#repositories/base/base_repository';
import PropositionCategory from '#models/proposition_category';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations';

export default class PropositionCategoryRepository extends BaseRepository<typeof PropositionCategory> {
    constructor() {
        super(PropositionCategory);
    }

    public async getMultipleCategories(categoryIds: string[], trx: TransactionClientContract): Promise<PropositionCategory[]> {
        if (!categoryIds || categoryIds.length === 0) {
            return [];
        }

        return this.Model.query({ client: trx }).whereIn('id', categoryIds);
    }

    public async listAll(orderBy: keyof PropositionCategory['$attributes'] = 'name', trx?: TransactionClientContract): Promise<PropositionCategory[]> {
        return trx ? this.Model.query({ client: trx }).orderBy(orderBy as string) : this.Model.query().orderBy(orderBy as string);
    }

    public async findByPublicId(
        identifier: string,
        preload: ExtractModelRelations<InstanceType<typeof PropositionCategory>>[] = [],
        trx?: TransactionClientContract
    ): Promise<PropositionCategory | null> {
        const query = trx ? this.Model.query({ client: trx }) : this.Model.query();
        query.where('id', identifier);
        preload.forEach((relation) => query.preload(relation));
        return query.first();
    }
}
