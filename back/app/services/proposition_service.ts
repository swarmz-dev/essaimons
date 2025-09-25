import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import type User from '#models/user';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import UserRepository from '#repositories/user_repository';
import PropositionRepository from '#repositories/proposition_repository';
import File from '#models/file';
import SlugifyService from '#services/slugify_service';
import path from 'node:path';
import app from '@adonisjs/core/services/app';
import { cuid } from '@adonisjs/core/helpers';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import { DateTime } from 'luxon';
import fsPromises from 'node:fs/promises';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import PropositionCategoryRepository from '#repositories/proposition_category_repository';
import FileService from '#services/file_service';

interface CreatePropositionPayload {
    title: string;
    summary: string;
    detailedDescription: string;
    smartObjectives: string;
    impacts: string;
    mandatesDescription: string;
    expertise?: string | null;
    clarificationDeadline: string;
    improvementDeadline: string;
    voteDeadline: string;
    mandateDeadline: string;
    evaluationDeadline: string;
    categoryIds: string[];
    associatedPropositionIds?: string[];
    rescueInitiatorIds: string[];
}

interface CreatePropositionFiles {
    visual?: any | null;
    attachments?: any[];
}

@inject()
export default class PropositionService {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly propositionCategoryRepository: PropositionCategoryRepository,
        private readonly userRepository: UserRepository,
        private readonly slugifyService: SlugifyService,
        private readonly fileService: FileService
    ) {}

    public async create(payload: CreatePropositionPayload, creator: User, files: CreatePropositionFiles): Promise<Proposition> {
        const trx: TransactionClientContract = await db.transaction();

        try {
            const categories: PropositionCategory[] = await this.propositionCategoryRepository.getMultipleCategories(payload.categoryIds, trx);
            if (categories.length !== payload.categoryIds.length) {
                throw new Error('messages.proposition.create.invalid-category');
            }

            const rescueUsers: User[] = await this.userRepository.getRescueUsers(payload.rescueInitiatorIds, creator, trx);
            if (rescueUsers.length !== payload.rescueInitiatorIds.length) {
                throw new Error('messages.proposition.create.invalid-rescue');
            }

            const associatedIds: string[] = payload.associatedPropositionIds ?? [];
            let existingAssociations: Proposition[] = [];
            if (associatedIds.length) {
                existingAssociations = await this.propositionRepository.getExistingAssociatedPropositions(associatedIds, trx);
                if (existingAssociations.length !== associatedIds.length) {
                    throw new Error('messages.proposition.create.invalid-association');
                }
            }

            const clarificationDate: DateTime = this.parseIsoDate(payload.clarificationDeadline);
            const improvementDate: DateTime = this.parseIsoDate(payload.improvementDeadline);
            const voteDate: DateTime = this.parseIsoDate(payload.voteDeadline);
            const mandateDate: DateTime = this.parseIsoDate(payload.mandateDeadline);
            const evaluationDate: DateTime = this.parseIsoDate(payload.evaluationDeadline);

            const proposition: Proposition = await Proposition.create(
                {
                    title: payload.title,
                    summary: payload.summary,
                    detailedDescription: payload.detailedDescription,
                    smartObjectives: payload.smartObjectives,
                    impacts: payload.impacts,
                    mandatesDescription: payload.mandatesDescription,
                    expertise: payload.expertise ?? null,
                    clarificationDeadline: clarificationDate,
                    improvementDeadline: improvementDate,
                    voteDeadline: voteDate,
                    mandateDeadline: mandateDate,
                    evaluationDeadline: evaluationDate,
                    creatorId: creator.id,
                    visualFileId: null,
                },
                { client: trx }
            );

            proposition.useTransaction(trx);

            await proposition.related('categories').attach(categories.map((category: PropositionCategory): string => category.id));
            await proposition.related('rescueInitiators').attach(rescueUsers.map((user: User): string => user.id));

            const visualFile: any | undefined | null = files.visual;
            if (visualFile && visualFile.size > 0) {
                const visualFilePath: string = 'static/propositions/visuals';
                await fsPromises.mkdir(app.makePath(visualFilePath), { recursive: true });
                visualFile.clientName = `${cuid()}-${this.slugifyService.slugify(visualFile.clientName)}`;
                await visualFile.move(app.makePath(visualFilePath), { overwrite: false });

                const storedVisual: File = await File.create(
                    {
                        name: visualFile.clientName,
                        path: `${visualFilePath}/${visualFile.clientName}`,
                        extension: path.extname(visualFile.clientName),
                        mimeType: visualFile.type && visualFile.subtype ? `${visualFile.type}/${visualFile.subtype}` : visualFile.headers['content-type'] || 'application/octet-stream',
                        size: visualFile.size,
                        type: FileTypeEnum.PROPOSITION_VISUAL,
                    },
                    { client: trx }
                );

                proposition.visualFileId = storedVisual.id;
                await proposition.save();
            }

            const attachmentFiles: any[] = files.attachments?.filter((attachment) => attachment && attachment.size > 0) ?? [];
            if (attachmentFiles.length) {
                const attachmentFolder: string = 'static/propositions/attachments';
                const storedAttachments: File[] = [];

                await fsPromises.mkdir(app.makePath(attachmentFolder), { recursive: true });

                for (const attachment of attachmentFiles) {
                    attachment.clientName = `${cuid()}-${this.slugifyService.slugify(attachment.clientName)}`;
                    await attachment.move(app.makePath(attachmentFolder), { overwrite: false });

                    const stored: File = await File.create(
                        {
                            name: attachment.clientName,
                            path: `${attachmentFolder}/${attachment.clientName}`,
                            extension: path.extname(attachment.clientName),
                            mimeType: attachment.type && attachment.subtype ? `${attachment.type}/${attachment.subtype}` : attachment.headers['content-type'] || 'application/octet-stream',
                            size: attachment.size,
                            type: FileTypeEnum.PROPOSITION_ATTACHMENT,
                        },
                        { client: trx }
                    );
                    storedAttachments.push(stored);
                }

                await proposition.related('attachments').attach(storedAttachments.map((file: File): string => file.id));
            }

            if (existingAssociations.length) {
                const associationRows = existingAssociations.map((association: Proposition) => ({
                    proposition_id: proposition.id,
                    related_proposition_id: association.id,
                }));
                const reciprocalRows = existingAssociations.map((association: Proposition) => ({
                    proposition_id: association.id,
                    related_proposition_id: proposition.id,
                }));

                await trx.insertQuery().table(this.associationsTableName()).insert(associationRows);
                await trx.insertQuery().table(this.associationsTableName()).insert(reciprocalRows);
            }

            await trx.commit();

            await Promise.all([
                proposition.load('categories'),
                proposition.load('rescueInitiators'),
                proposition.load('associatedPropositions'),
                proposition.load('attachments'),
                proposition.load('creator'),
            ]);

            if (proposition.visualFileId) {
                await proposition.load('visual');
            }

            return proposition;
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    public async update(proposition: Proposition, payload: CreatePropositionPayload, actor: User): Promise<Proposition> {
        const trx: TransactionClientContract = await db.transaction();

        try {
            const categories: PropositionCategory[] = await this.propositionCategoryRepository.getMultipleCategories(payload.categoryIds, trx);
            if (categories.length !== payload.categoryIds.length) {
                throw new Error('messages.proposition.create.invalid-category');
            }

            const rescueUsers: User[] = await this.userRepository.getRescueUsers(payload.rescueInitiatorIds, actor, trx, { includeCurrentUser: true });
            if (rescueUsers.length !== payload.rescueInitiatorIds.length) {
                throw new Error('messages.proposition.create.invalid-rescue');
            }

            const associatedIds: string[] = payload.associatedPropositionIds ?? [];
            let existingAssociations: Proposition[] = [];
            if (associatedIds.length) {
                existingAssociations = await this.propositionRepository.getExistingAssociatedPropositions(associatedIds, trx);
                if (existingAssociations.length !== associatedIds.length) {
                    throw new Error('messages.proposition.create.invalid-association');
                }
            }

            const clarificationDate: DateTime = this.parseIsoDate(payload.clarificationDeadline);
            const improvementDate: DateTime = this.parseIsoDate(payload.improvementDeadline);
            const voteDate: DateTime = this.parseIsoDate(payload.voteDeadline);
            const mandateDate: DateTime = this.parseIsoDate(payload.mandateDeadline);
            const evaluationDate: DateTime = this.parseIsoDate(payload.evaluationDeadline);

            proposition.useTransaction(trx);

            proposition.merge({
                title: payload.title,
                summary: payload.summary,
                detailedDescription: payload.detailedDescription,
                smartObjectives: payload.smartObjectives,
                impacts: payload.impacts,
                mandatesDescription: payload.mandatesDescription,
                expertise: payload.expertise ?? null,
                clarificationDeadline: clarificationDate,
                improvementDeadline: improvementDate,
                voteDeadline: voteDate,
                mandateDeadline: mandateDate,
                evaluationDeadline: evaluationDate,
            });

            await proposition.save();

            await proposition.related('categories').sync(categories.map((category: PropositionCategory): string => category.id));
            await proposition.related('rescueInitiators').sync(rescueUsers.map((user: User): string => user.id));

            await trx.from(this.associationsTableName()).where('proposition_id', proposition.id).orWhere('related_proposition_id', proposition.id).delete();

            if (existingAssociations.length) {
                const associationRows = existingAssociations.map((association: Proposition) => ({
                    proposition_id: proposition.id,
                    related_proposition_id: association.id,
                }));
                const reciprocalRows = existingAssociations.map((association: Proposition) => ({
                    proposition_id: association.id,
                    related_proposition_id: proposition.id,
                }));

                await trx.insertQuery().table(this.associationsTableName()).insert(associationRows);
                await trx.insertQuery().table(this.associationsTableName()).insert(reciprocalRows);
            }

            await trx.commit();

            await Promise.all([
                proposition.load('categories'),
                proposition.load('rescueInitiators'),
                proposition.load('associatedPropositions'),
                proposition.load('attachments'),
                proposition.load('creator'),
            ]);

            if (proposition.visualFileId) {
                await proposition.load('visual');
            }

            return proposition;
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    public async delete(proposition: Proposition): Promise<void> {
        await proposition.load('attachments');
        if (proposition.visualFileId) {
            await proposition.load('visual');
        }

        const attachmentFiles: File[] = [...(proposition.attachments ?? [])];
        const visualFile: File | undefined = proposition.visualFileId ? (proposition.visual ?? undefined) : undefined;

        const trx: TransactionClientContract = await db.transaction();

        try {
            proposition.useTransaction(trx);
            await proposition.delete();

            for (const file of attachmentFiles) {
                file.useTransaction(trx);
                await file.delete();
            }

            if (visualFile) {
                visualFile.useTransaction(trx);
                await visualFile.delete();
            }

            await trx.commit();

            for (const file of attachmentFiles) {
                this.fileService.delete(file);
            }

            if (visualFile) {
                this.fileService.delete(visualFile);
            }
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    private associationsTableName(): string {
        return 'proposition_associations';
    }

    private parseIsoDate(value: string): DateTime {
        const dateTime: DateTime = DateTime.fromISO(value);
        if (!dateTime.isValid) {
            throw new Error('messages.proposition.create.invalid-date');
        }
        return dateTime;
    }
}
