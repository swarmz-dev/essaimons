import BaseRepository from '#repositories/base/base_repository';
import PropositionCategory from '#models/proposition_category';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations';

export default class PropositionCategoryRepository extends BaseRepository<typeof PropositionCategory> {
    constructor() {
        super(PropositionCategory);
    }

    public async getMultipleCategories(categoryIds: string[], trx: TransactionClientContract): Promise<PropositionCategory[]> {
        const numericIds: number[] = [];
        const uuidIds: string[] = [];

        for (const rawId of categoryIds) {
            const trimmed = rawId?.toString().trim();
            if (!trimmed) continue;
            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                numericIds.push(Math.floor(asNumber));
            } else {
                uuidIds.push(trimmed);
            }
        }

        if (numericIds.length === 0 && uuidIds.length === 0) {
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

    public async listAll(orderBy: keyof PropositionCategory['$attributes'] = 'name', trx?: TransactionClientContract): Promise<PropositionCategory[]> {
        return trx ? this.Model.query({ client: trx }).orderBy(orderBy as string) : this.Model.query().orderBy(orderBy as string);
    }

    public async findByPublicId(
        identifier: string,
        preload: ExtractModelRelations<InstanceType<typeof PropositionCategory>>[] = [],
        trx?: TransactionClientContract
    ): Promise<PropositionCategory | null> {
        const query = trx ? this.Model.query({ client: trx }) : this.Model.query();
        const numericValue = Number(identifier);
        if (Number.isFinite(numericValue)) {
            query.where('front_id', Math.floor(numericValue));
        } else {
            query.where('id', identifier);
        }
        preload.forEach((relation) => query.preload(relation));
        return query.first();
    }
}
