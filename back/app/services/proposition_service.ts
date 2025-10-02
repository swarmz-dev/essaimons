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
import { cuid } from '@adonisjs/core/helpers';
import { FileTypeEnum, PropositionStatusEnum, PropositionVisibilityEnum } from '#types';
import { DateTime } from 'luxon';
import { TransactionClientContract } from '@adonisjs/lucid/types/database';
import PropositionCategoryRepository from '#repositories/proposition_category_repository';
import FileService from '#services/file_service';
import mime from 'mime-types';
import PropositionWorkflowService, { PropositionWorkflowException } from '#services/proposition_workflow_service';

interface CreatePropositionPayload {
    title: string;
    summary: string;
    detailedDescription: string;
    smartObjectives: string;
    impacts: string;
    mandatesDescription: string;
    expertise?: string | null;
    clarificationDeadline: string;
    amendmentDeadline: string;
    voteDeadline: string;
    mandateDeadline: string;
    evaluationDeadline: string;
    categoryIds: string[];
    associatedPropositionIds?: string[];
    rescueInitiatorIds: string[];
    isDraft?: boolean;
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
        private readonly fileService: FileService,
        private readonly propositionWorkflowService: PropositionWorkflowService
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
            const amendmentDate: DateTime = this.parseIsoDate(payload.amendmentDeadline);
            const voteDate: DateTime = this.parseIsoDate(payload.voteDeadline);
            const mandateDate: DateTime = this.parseIsoDate(payload.mandateDeadline);
            const evaluationDate: DateTime = this.parseIsoDate(payload.evaluationDeadline);

            const isDraft = payload.isDraft ?? false;
            const initialStatus = isDraft ? PropositionStatusEnum.DRAFT : PropositionStatusEnum.CLARIFY;
            const initialVisibility = isDraft ? PropositionVisibilityEnum.PRIVATE : PropositionVisibilityEnum.PUBLIC;

            const proposition: Proposition = await Proposition.create(
                {
                    title: payload.title,
                    summary: payload.summary,
                    detailedDescription: payload.detailedDescription,
                    smartObjectives: payload.smartObjectives,
                    impacts: payload.impacts,
                    mandatesDescription: payload.mandatesDescription,
                    expertise: payload.expertise ?? null,
                    status: initialStatus,
                    statusStartedAt: DateTime.now(),
                    visibility: initialVisibility,
                    archivedAt: null,
                    settingsSnapshot: {},
                    clarificationDeadline: clarificationDate,
                    amendmentDeadline: amendmentDate,
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

            await this.propositionWorkflowService.recordInitialHistory(proposition, creator, trx);

            const visualFile: any | undefined | null = files.visual;
            if (visualFile && visualFile.size > 0) {
                const visualExtension = path.extname(visualFile.clientName);
                const visualBaseName = path.basename(visualFile.clientName, visualExtension);
                const sanitizedName = `${cuid()}-${this.slugifyService.slugify(visualBaseName)}${visualExtension}`;
                const key = `propositions/visuals/${sanitizedName}`;
                const uploadMeta = await this.fileService.storeMultipartFile(visualFile, key);
                const resolvedMime =
                    uploadMeta.mimeType ||
                    (visualFile.type && visualFile.subtype ? `${visualFile.type}/${visualFile.subtype}` : null) ||
                    visualFile.headers?.['content-type'] ||
                    null ||
                    mime.lookup(sanitizedName) ||
                    'application/octet-stream';

                const storedVisual: File = await File.create(
                    {
                        name: sanitizedName,
                        path: key,
                        extension: visualExtension,
                        mimeType: resolvedMime,
                        size: uploadMeta.size,
                        type: FileTypeEnum.PROPOSITION_VISUAL,
                    },
                    { client: trx }
                );

                proposition.visualFileId = storedVisual.id;
                await proposition.save();
            }

            const attachmentFiles: any[] = files.attachments?.filter((attachment) => attachment && attachment.size > 0) ?? [];
            if (attachmentFiles.length) {
                const storedAttachments: File[] = [];

                for (const attachment of attachmentFiles) {
                    const attachmentExtension = path.extname(attachment.clientName);
                    const attachmentBaseName = path.basename(attachment.clientName, attachmentExtension);
                    const sanitizedName = `${cuid()}-${this.slugifyService.slugify(attachmentBaseName)}${attachmentExtension}`;
                    const key = `propositions/attachments/${sanitizedName}`;
                    const uploadMeta = await this.fileService.storeMultipartFile(attachment, key);
                    const resolvedMime =
                        uploadMeta.mimeType ||
                        (attachment.type && attachment.subtype ? `${attachment.type}/${attachment.subtype}` : null) ||
                        attachment.headers?.['content-type'] ||
                        null ||
                        mime.lookup(sanitizedName) ||
                        'application/octet-stream';

                    const stored: File = await File.create(
                        {
                            name: sanitizedName,
                            path: key,
                            extension: attachmentExtension,
                            mimeType: resolvedMime,
                            size: uploadMeta.size,
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

    public async update(proposition: Proposition, payload: CreatePropositionPayload, actor: User, files: CreatePropositionFiles = {}): Promise<Proposition> {
        const trx: TransactionClientContract = await db.transaction();

        try {
            const canEdit = await this.propositionWorkflowService.canPerform(proposition, actor, 'edit_proposition');
            if (!canEdit) {
                throw new Error('messages.proposition.update.forbidden');
            }

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
            const amendmentDate: DateTime = this.parseIsoDate(payload.amendmentDeadline);
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
                amendmentDeadline: amendmentDate,
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

            const filesToDeleteAfterCommit: File[] = [];

            const visualFileInput = files.visual;
            if (visualFileInput && visualFileInput.size > 0) {
                const previousVisualId = proposition.visualFileId;
                const previousVisual: File | null = previousVisualId ? await File.query({ client: trx }).where('id', previousVisualId).first() : null;

                const visualExtension = path.extname(visualFileInput.clientName);
                const visualBaseName = path.basename(visualFileInput.clientName, visualExtension);
                const sanitizedName = `${cuid()}-${this.slugifyService.slugify(visualBaseName)}${visualExtension}`;
                const key = `propositions/visuals/${sanitizedName}`;
                const uploadMeta = await this.fileService.storeMultipartFile(visualFileInput, key);
                const resolvedMime =
                    uploadMeta.mimeType ||
                    (visualFileInput.type && visualFileInput.subtype ? `${visualFileInput.type}/${visualFileInput.subtype}` : null) ||
                    visualFileInput.headers?.['content-type'] ||
                    null ||
                    mime.lookup(sanitizedName) ||
                    'application/octet-stream';

                const storedVisual: File = await File.create(
                    {
                        name: sanitizedName,
                        path: key,
                        extension: visualExtension,
                        mimeType: resolvedMime,
                        size: uploadMeta.size,
                        type: FileTypeEnum.PROPOSITION_VISUAL,
                    },
                    { client: trx }
                );

                proposition.visualFileId = storedVisual.id;
                await proposition.save();

                if (previousVisual) {
                    previousVisual.useTransaction(trx);
                    await previousVisual.delete();
                    filesToDeleteAfterCommit.push(previousVisual);
                }
            }

            const attachmentFiles: any[] = files.attachments?.filter((attachment) => attachment && attachment.size > 0) ?? [];
            if (attachmentFiles.length) {
                const storedAttachments: File[] = [];

                for (const attachment of attachmentFiles) {
                    const attachmentExtension = path.extname(attachment.clientName);
                    const attachmentBaseName = path.basename(attachment.clientName, attachmentExtension);
                    const sanitizedName = `${cuid()}-${this.slugifyService.slugify(attachmentBaseName)}${attachmentExtension}`;
                    const key = `propositions/attachments/${sanitizedName}`;
                    const uploadMeta = await this.fileService.storeMultipartFile(attachment, key);
                    const resolvedMime =
                        uploadMeta.mimeType ||
                        (attachment.type && attachment.subtype ? `${attachment.type}/${attachment.subtype}` : null) ||
                        attachment.headers?.['content-type'] ||
                        null ||
                        mime.lookup(sanitizedName) ||
                        'application/octet-stream';

                    const stored: File = await File.create(
                        {
                            name: sanitizedName,
                            path: key,
                            extension: attachmentExtension,
                            mimeType: resolvedMime,
                            size: uploadMeta.size,
                            type: FileTypeEnum.PROPOSITION_ATTACHMENT,
                        },
                        { client: trx }
                    );
                    storedAttachments.push(stored);
                }

                await proposition.related('attachments').attach(storedAttachments.map((file: File): string => file.id));
            }

            await trx.commit();

            for (const file of filesToDeleteAfterCommit) {
                await this.fileService.delete(file);
            }

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
                await this.fileService.delete(file);
            }

            if (visualFile) {
                await this.fileService.delete(visualFile);
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

    public async transition(
        proposition: Proposition,
        actor: User,
        targetStatus: PropositionStatusEnum,
        options: { reason?: string | null; metadata?: Record<string, unknown> } = {}
    ): Promise<Proposition> {
        const trx: TransactionClientContract = await db.transaction();

        try {
            proposition.useTransaction(trx);
            const trimmedReason = options.reason ? options.reason.trim() : undefined;

            const updated = await this.propositionWorkflowService.transition(proposition, actor, targetStatus, {
                reason: trimmedReason && trimmedReason.length ? trimmedReason : null,
                metadata: options.metadata ?? {},
                transaction: trx,
            });

            await trx.commit();

            return updated;
        } catch (error) {
            await trx.rollback();
            if (error instanceof PropositionWorkflowException) {
                throw error;
            }
            throw error;
        }
    }
}
