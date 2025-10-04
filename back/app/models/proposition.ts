import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations';
import User from '#models/user';
import File from '#models/file';
import PropositionCategory from '#models/proposition_category';
import type { SerializedProposition } from '#types/serialized/serialized_proposition';
import type { SerializedPropositionSummary } from '#types/serialized/serialized_proposition_summary';
import type { SerializedPropositionListItem } from '#types/serialized/serialized_proposition_list_item';
import { SerializedUserSummary } from '#types/serialized/serialized_user_summary';
import { SerializedPropositionCategory } from '#types/serialized/serialized_proposition_category';
import { SerializedFile } from '#types/serialized/serialized_file';
import PropositionStatusHistory from '#models/proposition_status_history';
import PropositionEvent from '#models/proposition_event';
import PropositionVote from '#models/proposition_vote';
import PropositionMandate from '#models/proposition_mandate';
import PropositionComment from '#models/proposition_comment';
import PropositionReaction from '#models/proposition_reaction';
import { PropositionStatusEnum, PropositionVisibilityEnum } from '#types';

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
    declare mandatesDescription: string; // Mandates description

    @column()
    declare expertise?: string | null;

    @column()
    declare status: PropositionStatusEnum;

    @column.dateTime()
    declare statusStartedAt: DateTime;

    @column()
    declare visibility: PropositionVisibilityEnum;

    @column.date()
    declare clarificationDeadline: DateTime;

    @column.date()
    declare amendmentDeadline: DateTime;

    @column.date()
    declare voteDeadline: DateTime;

    @column.date()
    declare mandateDeadline: DateTime;

    @column.date()
    declare evaluationDeadline: DateTime;

    @column.dateTime()
    declare archivedAt?: DateTime | null;

    @column()
    declare settingsSnapshot: Record<string, unknown>;

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

    @hasMany((): typeof PropositionStatusHistory => PropositionStatusHistory)
    declare statusHistory: HasMany<typeof PropositionStatusHistory>;

    @hasMany((): typeof PropositionEvent => PropositionEvent)
    declare events: HasMany<typeof PropositionEvent>;

    @hasMany((): typeof PropositionVote => PropositionVote)
    declare votes: HasMany<typeof PropositionVote>;

    @hasMany((): typeof PropositionMandate => PropositionMandate)
    declare mandates: HasMany<typeof PropositionMandate>;

    @hasMany((): typeof PropositionComment => PropositionComment)
    declare comments: HasMany<typeof PropositionComment>;

    @hasMany((): typeof PropositionReaction => PropositionReaction)
    declare reactions: HasMany<typeof PropositionReaction>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public summarySerialize(): SerializedPropositionSummary {
        const publicId = this.frontId !== undefined && this.frontId !== null ? String(this.frontId) : this.id;
        return {
            id: publicId,
            title: this.title,
        };
    }

    public listSerialize(): SerializedPropositionListItem {
        const publicId = this.frontId !== undefined && this.frontId !== null ? String(this.frontId) : this.id;
        return {
            id: publicId,
            title: this.title,
            summary: this.summary,
            categories: (this.categories ?? []).map((category: PropositionCategory): SerializedPropositionCategory => category.apiSerialize()),
            status: this.status,
            visibility: this.visibility,
            statusStartedAt: this.statusStartedAt?.toISO() ?? '',
            clarificationDeadline: this.clarificationDeadline?.toISODate() ?? '',
            amendmentDeadline: this.amendmentDeadline?.toISODate() ?? '',
            voteDeadline: this.voteDeadline?.toISODate() ?? '',
            mandateDeadline: this.mandateDeadline?.toISODate() ?? '',
            evaluationDeadline: this.evaluationDeadline?.toISODate() ?? '',
            archivedAt: this.archivedAt?.toISO() ?? undefined,
            creator: this.creator ? this.creator.summarySerialize() : undefined,
            visual: this.visual?.apiSerialize(),
            createdAt: this.createdAt?.toString(),
            updatedAt: this.updatedAt?.toString(),
        };
    }

    public apiSerialize(): SerializedProposition {
        const publicId = this.frontId !== undefined && this.frontId !== null ? String(this.frontId) : this.id;
        return {
            id: publicId,
            title: this.title,
            summary: this.summary,
            detailedDescription: this.detailedDescription,
            smartObjectives: this.smartObjectives,
            impacts: this.impacts,
            mandatesDescription: this.mandatesDescription,
            expertise: this.expertise,
            status: this.status,
            statusStartedAt: this.statusStartedAt.toISO() ?? '',
            visibility: this.visibility,
            clarificationDeadline: this.clarificationDeadline.toISODate() ?? '',
            amendmentDeadline: this.amendmentDeadline.toISODate() ?? '',
            voteDeadline: this.voteDeadline.toISODate() ?? '',
            mandateDeadline: this.mandateDeadline.toISODate() ?? '',
            evaluationDeadline: this.evaluationDeadline.toISODate() ?? '',
            archivedAt: this.archivedAt?.toISO() ?? undefined,
            settingsSnapshot: this.settingsSnapshot ?? {},
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
