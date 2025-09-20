import BaseRepository from '#repositories/base/base_repository';
import PropositionCategory from '#models/proposition_category';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';

export default class PropositionCategoryRepository extends BaseRepository<typeof PropositionCategory> {
    constructor() {
        super(PropositionCategory);
    }

    public async getMultipleCategories(categoryIds: number[], trx: TransactionClientContract): Promise<PropositionCategory[]> {
        return this.Model.query({ client: trx }).whereIn('front_id', categoryIds);
    }
}
