import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import type User from '#models/user';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import UserRepository from '#repositories/user_repository';
import PropositionRepository from '#repositories/proposition_repository';
import type { MultipartFileContract } from '@adonisjs/core/bodyparser';
import File from '#models/file';
import SlugifyService from '#services/slugify_service';
import path from 'node:path';
import app from '@adonisjs/core/services/app';
import { cuid } from '@adonisjs/core/helpers';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import { DateTime } from 'luxon';
import fsPromises from 'node:fs/promises';

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
    rescueInitiatorIds: number[];
}

interface CreatePropositionFiles {
    visual?: MultipartFileContract | null;
    attachments?: MultipartFileContract[];
}

@inject()
export default class PropositionService {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly userRepository: UserRepository,
        private readonly slugifyService: SlugifyService
    ) {}

    public async create(payload: CreatePropositionPayload, creator: User, files: CreatePropositionFiles): Promise<Proposition> {
        const trx = await db.transaction();

        try {
            const categories: PropositionCategory[] = await PropositionCategory.query({ client: trx }).whereIn('id', payload.categoryIds);
            if (categories.length !== payload.categoryIds.length) {
                throw new Error('messages.proposition.create.invalid-category');
            }

            const rescueUsers: User[] = await this.userRepository.Model.query({ client: trx }).whereIn('front_id', payload.rescueInitiatorIds);
            if (rescueUsers.length !== payload.rescueInitiatorIds.length) {
                throw new Error('messages.proposition.create.invalid-rescue');
            }

            const uniqueRescueIds: string[] = rescueUsers.map((user: User) => user.id);
            if (uniqueRescueIds.includes(creator.id)) {
                throw new Error('messages.proposition.create.rescue-cannot-include-creator');
            }

            const associatedIds: string[] = payload.associatedPropositionIds?.filter((id: string) => id !== '') ?? [];
            if (associatedIds.includes('')) {
                associatedIds.splice(associatedIds.indexOf(''), 1);
            }
            const uniqueAssociatedIds: string[] = [...new Set(associatedIds)];

            if (uniqueAssociatedIds.length) {
                const existingAssociations: Proposition[] = await this.propositionRepository.Model.query({ client: trx }).whereIn('id', uniqueAssociatedIds);
                if (existingAssociations.length !== uniqueAssociatedIds.length) {
                    throw new Error('messages.proposition.create.invalid-association');
                }
            }

            const clarificationDate: DateTime = this.parseIsoDate(payload.clarificationDeadline);
            const improvementDate: DateTime = this.parseIsoDate(payload.improvementDeadline);
            const voteDate: DateTime = this.parseIsoDate(payload.voteDeadline);
            const mandateDate: DateTime = this.parseIsoDate(payload.mandateDeadline);
            const evaluationDate: DateTime = this.parseIsoDate(payload.evaluationDeadline);

            const proposition: Proposition = await this.propositionRepository.Model.create(
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
                },
                { client: trx }
            );

            proposition.useTransaction(trx);

            await proposition.related('categories').attach(payload.categoryIds);
            await proposition.related('rescueInitiators').attach(uniqueRescueIds);

            const visualFile: MultipartFileContract | undefined | null = files.visual;
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

            const attachmentFiles: MultipartFileContract[] = files.attachments?.filter((attachment) => attachment && attachment.size > 0) ?? [];
            if (attachmentFiles.length) {
                const attachmentFolder: string = 'static/propositions/attachments';
                const storedAttachments: File[] = [];

                await fsPromises.mkdir(app.makePath(attachmentFolder), { recursive: true });

                for (const attachment of attachmentFiles) {
                    attachment.clientName = `${cuid()}-${this.slugifyService.slugify(attachment.clientName)}`;
                    await attachment.move(app.makePath(attachmentFolder), { overwrite: false });

                    const stored = await File.create(
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

                await proposition.related('attachments').attach(storedAttachments.map((file) => file.id));
            }

            if (uniqueAssociatedIds.length) {
                const associationRows = uniqueAssociatedIds.map((id: string) => ({
                    proposition_id: proposition.id,
                    related_proposition_id: id,
                }));
                const reciprocalRows = uniqueAssociatedIds.map((id: string) => ({
                    proposition_id: id,
                    related_proposition_id: proposition.id,
                }));

                await trx.from(this.associationsTableName()).insert(associationRows).onConflict(['proposition_id', 'related_proposition_id']).ignore();
                await trx.from(this.associationsTableName()).insert(reciprocalRows).onConflict(['proposition_id', 'related_proposition_id']).ignore();
            }

            await trx.commit();

            await proposition.load('categories');
            await proposition.load('rescueInitiators');
            await proposition.load('associatedPropositions');
            await proposition.load('attachments');
            await proposition.load('creator');
            await proposition.load('visual');

            return proposition;
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
