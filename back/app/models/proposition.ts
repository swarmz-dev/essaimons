import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import File from '#models/file';
import PropositionCategory from '#models/proposition_category';
import type { SerializedProposition } from '#types/serialized/serialized_proposition';
import type { SerializedPropositionSummary } from '#types/serialized/serialized_proposition_summary';
import { SerializedUserSummary } from '#types/serialized/serialized_user_summary';
import { SerializedPropositionCategory } from '#types/serialized/serialized_proposition_category';
import { SerializedFile } from '#types/serialized/serialized_file';

export default class Proposition extends BaseModel {
    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare frontId: number;

    @column()
    declare title: string;

    @column()
    declare summary: string;

    @column()
    declare detailedDescription: string;

    @column()
    declare smartObjectives: string;

    @column()
    declare impacts: string;

    @column()
    declare mandatesDescription: string;

    @column()
    declare expertise?: string | null;

    @column.date()
    declare clarificationDeadline: DateTime;

    @column.date()
    declare improvementDeadline: DateTime;

    @column.date()
    declare voteDeadline: DateTime;

    @column.date()
    declare mandateDeadline: DateTime;

    @column.date()
    declare evaluationDeadline: DateTime;

    @column()
    declare creatorId: string;

    @column()
    declare visualFileId?: string | null;

    @belongsTo((): typeof User => User, {
        foreignKey: 'creatorId',
    })
    declare creator: BelongsTo<typeof User>;

    @belongsTo((): typeof File => File, {
        foreignKey: 'visualFileId',
    })
    declare visual: BelongsTo<typeof File>;

    @manyToMany((): typeof PropositionCategory => PropositionCategory, {
        pivotTable: 'proposition_category_pivot',
        pivotForeignKey: 'proposition_id',
        pivotRelatedForeignKey: 'category_id',
    })
    declare categories: ManyToMany<typeof PropositionCategory>;

    @manyToMany((): typeof User => User, {
        pivotTable: 'proposition_rescue_initiators',
        pivotForeignKey: 'proposition_id',
        pivotRelatedForeignKey: 'user_id',
    })
    declare rescueInitiators: ManyToMany<typeof User>;

    @manyToMany((): typeof Proposition => Proposition, {
        pivotTable: 'proposition_associations',
        pivotForeignKey: 'proposition_id',
        pivotRelatedForeignKey: 'related_proposition_id',
    })
    declare associatedPropositions: ManyToMany<typeof Proposition>;

    @manyToMany((): typeof File => File, {
        pivotTable: 'proposition_attachments',
        pivotForeignKey: 'proposition_id',
        pivotRelatedForeignKey: 'file_id',
    })
    declare attachments: ManyToMany<typeof File>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public summarySerialize(): SerializedPropositionSummary {
        return {
            id: this.frontId,
            title: this.title,
        };
    }

    public apiSerialize(): SerializedProposition {
        return {
            id: this.frontId,
            title: this.title,
            summary: this.summary,
            detailedDescription: this.detailedDescription,
            smartObjectives: this.smartObjectives,
            impacts: this.impacts,
            mandatesDescription: this.mandatesDescription,
            expertise: this.expertise,
            clarificationDeadline: this.clarificationDeadline.toISODate() ?? '',
            improvementDeadline: this.improvementDeadline.toISODate() ?? '',
            voteDeadline: this.voteDeadline.toISODate() ?? '',
            mandateDeadline: this.mandateDeadline.toISODate() ?? '',
            evaluationDeadline: this.evaluationDeadline.toISODate() ?? '',
            creator: this.creator.summarySerialize(),
            categories: (this.categories ?? []).map((category: PropositionCategory): SerializedPropositionCategory => category.apiSerialize()),
            rescueInitiators: (this.rescueInitiators ?? []).map((user: User): SerializedUserSummary => user.summarySerialize()),
            associatedPropositions: (this.associatedPropositions ?? []).map((proposition: Proposition): SerializedPropositionSummary => proposition.summarySerialize()),
            attachments: (this.attachments ?? []).map((file: File): SerializedFile => file.apiSerialize()),
            visual: this.visual?.apiSerialize(),
            createdAt: this.createdAt?.toString(),
            updatedAt: this.updatedAt?.toString(),
        };
    }
}
