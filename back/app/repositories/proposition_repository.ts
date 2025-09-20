import BaseRepository from '#repositories/base/base_repository';
import Proposition from '#models/proposition';

export default class PropositionRepository extends BaseRepository<typeof Proposition> {
    constructor() {
        super(Proposition);
    }
}
