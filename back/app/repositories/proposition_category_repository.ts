import BaseRepository from '#repositories/base/base_repository';
import PropositionCategory from '#models/proposition_category';

export default class PropositionCategoryRepository extends BaseRepository<typeof PropositionCategory> {
    constructor() {
        super(PropositionCategory);
    }
}
