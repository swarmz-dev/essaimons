import BaseRepository from '#repositories/base/base_repository';
import Proposition from '#models/proposition';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';

export default class PropositionRepository extends BaseRepository<typeof Proposition> {
    constructor() {
        super(Proposition);
    }

    public async getExistingAssociatedPropositions(associatedIds: number[], trx: TransactionClientContract): Promise<Proposition[]> {
        return this.Model.query({ client: trx }).whereIn('front_id', associatedIds);
    }
}
