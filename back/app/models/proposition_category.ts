import { DateTime } from 'luxon';
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import Proposition from '#models/proposition';
import type { SerializedPropositionCategory } from '#types/serialized/serialized_proposition_category';

export default class PropositionCategory extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare name: string;

    @manyToMany((): typeof Proposition => Proposition, {
        pivotTable: 'proposition_category_pivot',
    })
    declare propositions: ManyToMany<typeof Proposition>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize(): SerializedPropositionCategory {
        return {
            id: this.id,
            name: this.name,
        };
    }
}
