import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import User from '#models/user';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import File from '#models/file';
import hash from '@adonisjs/core/services/hash';
import FileService from '#services/file_service';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import { cuid } from '@adonisjs/core/helpers';
import { DateTime } from 'luxon';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import {
    ImportConfiguration,
    ImportResult,
    ExportedProposition,
    ExportedUserReference,
    ExportedCategoryReference,
    ExportedFileReference,
    ResolutionStrategy,
    MergeAction,
    ImportSession,
} from '#types/import_export_types';
import { UserRoleEnum } from '#types/enum/user_role_enum';
import PropositionImportAnalyzerService from '#services/proposition_import_analyzer_service';
import PropositionStatusHistory from '#models/proposition_status_history';
import PropositionVote from '#models/proposition_vote';
import VoteOption from '#models/vote_option';
import VoteBallot from '#models/vote_ballot';
import PropositionComment from '#models/proposition_comment';
import PropositionEvent from '#models/proposition_event';
import PropositionReaction from '#models/proposition_reaction';
import PropositionMandate from '#models/proposition_mandate';

@inject()
export default class PropositionImportExecutorService {
    constructor(
        private readonly analyzerService: PropositionImportAnalyzerService,
        private readonly fileService: FileService,
        private readonly workflowService: PropositionWorkflowService
    ) {}

    /**
     * Execute import with the provided configuration
     */
    public async executeImport(configuration: ImportConfiguration, executor: User): Promise<ImportResult> {
        // Get the import session
        const session: ImportSession | null = this.analyzerService.getImportSession(configuration.importId);

        if (!session) {
            throw new Error("Session d'import introuvable ou expirée");
        }

        const result: ImportResult = {
            success: false,
            summary: {
                propositionsCreated: 0,
                propositionsMerged: 0,
                propositionsSkipped: 0,
                usersCreated: 0,
                categoriesCreated: 0,
                filesUploaded: 0,
            },
            details: [],
            errors: [],
        };

        // Maps to keep track of source IDs -> target IDs
        const userIdMap = new Map<string, string>();
        const categoryIdMap = new Map<string, string>();
        const propositionIdMap = new Map<string, string>();
        const fileIdMap = new Map<string, string>();

        // Create a global transaction
        const trx: TransactionClientContract = await db.transaction();

        try {
            // Phase 1: Resolve all users
            await this.resolveUsers(session.exportData.propositions, configuration, userIdMap, result, trx);

            // Phase 2: Resolve all categories
            await this.resolveCategories(session.exportData.propositions, configuration, categoryIdMap, result, trx);

            // Phase 3: Import propositions
            for (let i = 0; i < session.exportData.propositions.length; i++) {
                const exportedProposition = session.exportData.propositions[i];

                try {
                    const detailResult = await this.importProposition(exportedProposition, i, configuration, userIdMap, categoryIdMap, propositionIdMap, fileIdMap, result, executor, trx);

                    result.details.push(detailResult);

                    // Import enriched data if proposition was created or merged
                    if (detailResult.targetId) {
                        await this.importEnrichedData(exportedProposition, detailResult.targetId, userIdMap, trx);
                    }
                } catch (error: any) {
                    result.details.push({
                        sourceId: exportedProposition.sourceId,
                        targetId: null,
                        action: 'FAILED',
                        warnings: [],
                        error: error.message,
                    });
                    result.errors.push(`Proposition "${exportedProposition.title}": ${error.message}`);
                }
            }

            // Phase 4: Create proposition associations
            await this.createPropositionAssociations(session.exportData.propositions, configuration, propositionIdMap, trx);

            await trx.commit();
            result.success = true;
        } catch (error: any) {
            await trx.rollback();
            result.success = false;
            result.errors.push(`Erreur globale: ${error.message}`);
        }

        return result;
    }

    /**
     * Resolve all referenced users
     */
    private async resolveUsers(
        propositions: ExportedProposition[],
        configuration: ImportConfiguration,
        userIdMap: Map<string, string>,
        result: ImportResult,
        trx: TransactionClientContract
    ): Promise<void> {
        const allUserRefs = new Map<string, ExportedUserReference>();

        // Collect all unique user references
        for (const prop of propositions) {
            allUserRefs.set(prop.externalReferences.creator.sourceId, prop.externalReferences.creator);

            for (const initiator of prop.externalReferences.rescueInitiators) {
                allUserRefs.set(initiator.sourceId, initiator);
            }
        }

        // Resolve each user
        for (const [sourceId, userRef] of allUserRefs) {
            const resolution = this.findResolution(configuration, userRef.sourceId, 'creator');

            if (resolution) {
                if (resolution.strategy === ResolutionStrategy.CREATE_NEW) {
                    // Create a new user
                    const newUser = await User.create(
                        {
                            username: userRef.username,
                            email: userRef.email,
                            password: await hash.make(resolution.createData?.password || cuid()),
                            role: (userRef.role as UserRoleEnum) || UserRoleEnum.USER,
                            enabled: true,
                        },
                        { client: trx }
                    );

                    userIdMap.set(sourceId, newUser.id);
                    result.summary.usersCreated++;
                } else if (resolution.strategy === ResolutionStrategy.MAP_EXISTING) {
                    // Map to an existing user
                    if (resolution.mappedId) {
                        userIdMap.set(sourceId, resolution.mappedId);
                    }
                }
            } else {
                // Try to find automatically
                const existingUser = await User.query({ client: trx }).where('email', userRef.email).orWhere('username', userRef.username).first();

                if (existingUser) {
                    userIdMap.set(sourceId, existingUser.id);
                }
            }
        }
    }

    /**
     * Resolve all referenced categories
     */
    private async resolveCategories(
        propositions: ExportedProposition[],
        configuration: ImportConfiguration,
        categoryIdMap: Map<string, string>,
        result: ImportResult,
        trx: TransactionClientContract
    ): Promise<void> {
        const allCategoryRefs = new Map<string, ExportedCategoryReference>();

        // Collect all unique category references
        for (const prop of propositions) {
            for (const cat of prop.externalReferences.categories) {
                allCategoryRefs.set(cat.sourceId, cat);
            }
        }

        // Resolve each category
        for (const [sourceId, catRef] of allCategoryRefs) {
            const resolution = this.findResolution(configuration, sourceId, 'categories');

            if (resolution) {
                if (resolution.strategy === ResolutionStrategy.CREATE_NEW) {
                    // Create a new category
                    const newCategory = await PropositionCategory.create(
                        {
                            name: catRef.name,
                        },
                        { client: trx }
                    );

                    categoryIdMap.set(sourceId, newCategory.id);
                    result.summary.categoriesCreated++;
                } else if (resolution.strategy === ResolutionStrategy.MAP_EXISTING) {
                    // Map to an existing category
                    if (resolution.mappedId) {
                        categoryIdMap.set(sourceId, resolution.mappedId);
                    }
                }
            } else {
                // Try to find automatically
                const existingCategory = await PropositionCategory.query({ client: trx }).where('name', catRef.name).first();

                if (existingCategory) {
                    categoryIdMap.set(sourceId, existingCategory.id);
                } else {
                    // Auto-create if no resolution specified
                    const newCategory = await PropositionCategory.create(
                        {
                            name: catRef.name,
                        },
                        { client: trx }
                    );

                    categoryIdMap.set(sourceId, newCategory.id);
                    result.summary.categoriesCreated++;
                }
            }
        }
    }

    /**
     * Import a proposition
     */
    private async importProposition(
        exportedProp: ExportedProposition,
        _index: number,
        configuration: ImportConfiguration,
        userIdMap: Map<string, string>,
        categoryIdMap: Map<string, string>,
        propositionIdMap: Map<string, string>,
        fileIdMap: Map<string, string>,
        result: ImportResult,
        _executor: User,
        trx: TransactionClientContract
    ): Promise<any> {
        const resolution = this.findResolution(configuration, exportedProp.sourceId, 'proposition');

        // Check if skip
        if (resolution && resolution.strategy === ResolutionStrategy.SKIP) {
            result.summary.propositionsSkipped++;
            return {
                sourceId: exportedProp.sourceId,
                targetId: null,
                action: 'SKIPPED',
                warnings: [],
            };
        }

        // Resolve the creator
        const creatorId = userIdMap.get(exportedProp.externalReferences.creator.sourceId);
        if (!creatorId) {
            throw new Error(`Créateur non résolu pour la proposition "${exportedProp.title}"`);
        }

        const creator = await User.findOrFail(creatorId, { client: trx });

        // Resolve categories
        const categoryIds: string[] = [];
        for (const catRef of exportedProp.externalReferences.categories) {
            const catId = categoryIdMap.get(catRef.sourceId);
            if (catId) {
                categoryIds.push(catId);
            }
        }

        // Resolve rescue initiators
        const rescueInitiatorIds: string[] = [];
        for (const initiatorRef of exportedProp.externalReferences.rescueInitiators) {
            const userId = userIdMap.get(initiatorRef.sourceId);
            if (userId) {
                rescueInitiatorIds.push(userId);
            }
        }

        // Import files
        let visualFileId: string | null = null;
        if (exportedProp.externalReferences.visual) {
            const visualFile = await this.importFile(exportedProp.externalReferences.visual, FileTypeEnum.PROPOSITION_VISUAL, fileIdMap, result, trx);
            visualFileId = visualFile.id;
        }

        const attachmentFileIds: string[] = [];
        for (const attachmentRef of exportedProp.externalReferences.attachments) {
            const attachmentFile = await this.importFile(attachmentRef, FileTypeEnum.PROPOSITION_ATTACHMENT, fileIdMap, result, trx);
            attachmentFileIds.push(attachmentFile.id);
        }

        // Create or merge the proposition
        if (resolution && resolution.strategy === ResolutionStrategy.MERGE && resolution.mappedId) {
            // Merge with an existing proposition
            const existingProp = await Proposition.findOrFail(resolution.mappedId, { client: trx });
            existingProp.useTransaction(trx);

            // Apply fields according to fieldResolutions
            if (resolution.fieldResolutions) {
                for (const fieldRes of resolution.fieldResolutions) {
                    if (fieldRes.action === MergeAction.KEEP_INCOMING) {
                        // Apply the imported value
                        const value = (exportedProp as any)[fieldRes.field];
                        if (value !== undefined) {
                            (existingProp as any)[fieldRes.field] = value;
                        }
                    }
                    // KEEP_CURRENT: do nothing
                    // MERGE_BOTH: for categories notably
                    if (fieldRes.field === 'categories' && fieldRes.action === MergeAction.MERGE_BOTH) {
                        await existingProp.load('categories');
                        const existingCatIds = existingProp.categories?.map((c) => c.id) || [];
                        const allCatIds = [...new Set([...existingCatIds, ...categoryIds])];
                        await existingProp.related('categories').sync(allCatIds);
                    }
                }
            }

            await existingProp.save();

            propositionIdMap.set(exportedProp.sourceId, existingProp.id);
            result.summary.propositionsMerged++;

            return {
                sourceId: exportedProp.sourceId,
                targetId: existingProp.id,
                action: 'MERGED',
                warnings: [],
            };
        } else {
            // Create a new proposition
            const categories = await PropositionCategory.query({ client: trx }).whereIn('id', categoryIds);

            const rescueUsers = rescueInitiatorIds.length > 0 ? await User.query({ client: trx }).whereIn('id', rescueInitiatorIds) : [];

            const proposition = await Proposition.create(
                {
                    title: exportedProp.title,
                    summary: exportedProp.summary || '',
                    detailedDescription: exportedProp.detailedDescription || '',
                    smartObjectives: exportedProp.smartObjectives || '',
                    impacts: exportedProp.impacts || '',
                    mandatesDescription: exportedProp.mandatesDescription || '',
                    expertise: exportedProp.expertise,
                    status: exportedProp.status,
                    statusStartedAt: DateTime.fromISO(exportedProp.statusStartedAt),
                    visibility: exportedProp.visibility,
                    archivedAt: exportedProp.archivedAt ? DateTime.fromISO(exportedProp.archivedAt) : undefined,
                    clarificationDeadline: exportedProp.clarificationDeadline ? DateTime.fromISO(exportedProp.clarificationDeadline) : undefined,
                    amendmentDeadline: exportedProp.amendmentDeadline ? DateTime.fromISO(exportedProp.amendmentDeadline) : undefined,
                    voteDeadline: exportedProp.voteDeadline ? DateTime.fromISO(exportedProp.voteDeadline) : undefined,
                    mandateDeadline: exportedProp.mandateDeadline ? DateTime.fromISO(exportedProp.mandateDeadline) : undefined,
                    evaluationDeadline: exportedProp.evaluationDeadline ? DateTime.fromISO(exportedProp.evaluationDeadline) : undefined,
                    settingsSnapshot: exportedProp.settingsSnapshot || {},
                    creatorId: creator.id,
                    visualFileId,
                    createdAt: DateTime.fromISO(exportedProp.createdAt),
                    updatedAt: DateTime.fromISO(exportedProp.updatedAt),
                },
                { client: trx }
            );

            proposition.useTransaction(trx);

            // Associate categories
            if (categories.length > 0) {
                await proposition.related('categories').attach(categories.map((c) => c.id));
            }

            // Associate rescue initiators
            if (rescueUsers.length > 0) {
                await proposition.related('rescueInitiators').attach(rescueUsers.map((u) => u.id));
            }

            // Associate attachments
            if (attachmentFileIds.length > 0) {
                await proposition.related('attachments').attach(attachmentFileIds);
            }

            // Enregistrer l'historique initial (only if no status history to import)
            if (!exportedProp.statusHistory || exportedProp.statusHistory.length === 0) {
                await this.workflowService.recordInitialHistory(proposition, creator, trx);
            }

            propositionIdMap.set(exportedProp.sourceId, proposition.id);
            result.summary.propositionsCreated++;

            return {
                sourceId: exportedProp.sourceId,
                targetId: proposition.id,
                action: 'CREATED',
                warnings: [],
            };
        }
    }

    /**
     * Import enriched data for a proposition
     */
    private async importEnrichedData(exportedProp: ExportedProposition, propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        // Import status history
        if (exportedProp.statusHistory && exportedProp.statusHistory.length > 0) {
            await this.importStatusHistory(exportedProp.statusHistory, propositionId, userIdMap, trx);
        }

        // Import votes with options and ballots
        if (exportedProp.votes && exportedProp.votes.length > 0) {
            await this.importVotes(exportedProp.votes, propositionId, userIdMap, trx);
        }

        // Import mandates
        if (exportedProp.mandates && exportedProp.mandates.length > 0) {
            await this.importMandates(exportedProp.mandates, propositionId, userIdMap, trx);
        }

        // Import comments
        if (exportedProp.comments && exportedProp.comments.length > 0) {
            await this.importComments(exportedProp.comments, propositionId, userIdMap, trx);
        }

        // Import events
        if (exportedProp.events && exportedProp.events.length > 0) {
            await this.importEvents(exportedProp.events, propositionId, userIdMap, trx);
        }

        // Import reactions
        if (exportedProp.reactions && exportedProp.reactions.length > 0) {
            await this.importReactions(exportedProp.reactions, propositionId, userIdMap, trx);
        }
    }

    /**
     * Import status history
     */
    private async importStatusHistory(statusHistoryData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        for (const historyItem of statusHistoryData) {
            const triggeredByUserId = historyItem.triggeredBy ? userIdMap.get(historyItem.triggeredBy.sourceId) : null;

            await PropositionStatusHistory.create(
                {
                    propositionId,
                    fromStatus: historyItem.fromStatus,
                    toStatus: historyItem.toStatus,
                    triggeredByUserId: triggeredByUserId || null,
                    reason: historyItem.reason,
                    metadata: historyItem.metadata || {},
                    createdAt: DateTime.fromISO(historyItem.createdAt),
                    updatedAt: DateTime.fromISO(historyItem.createdAt), // Use same timestamp
                },
                { client: trx }
            );
        }
    }

    /**
     * Import votes with options and ballots
     */
    private async importVotes(votesData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        for (const voteData of votesData) {
            const vote = await PropositionVote.create(
                {
                    propositionId,
                    phase: voteData.phase,
                    method: voteData.method,
                    title: voteData.title,
                    description: voteData.description,
                    openAt: voteData.openAt ? DateTime.fromISO(voteData.openAt) : null,
                    closeAt: voteData.closeAt ? DateTime.fromISO(voteData.closeAt) : null,
                    maxSelections: voteData.maxSelections,
                    status: voteData.status,
                    metadata: voteData.metadata || {},
                },
                { client: trx }
            );

            // Import vote options
            const optionIdMap = new Map<string, string>();
            if (voteData.options && voteData.options.length > 0) {
                for (const optionData of voteData.options) {
                    const option = await VoteOption.create(
                        {
                            voteId: vote.id,
                            label: optionData.label,
                            description: optionData.description,
                            position: optionData.position,
                            metadata: optionData.metadata || {},
                        },
                        { client: trx }
                    );
                    optionIdMap.set(optionData.sourceId, option.id);
                }
            }

            // Import ballots
            if (voteData.ballots && voteData.ballots.length > 0) {
                for (const ballotData of voteData.ballots) {
                    const voterId = userIdMap.get(ballotData.voter.sourceId);
                    if (!voterId) {
                        continue; // Skip if voter not resolved
                    }

                    // Map option IDs in payload
                    const payload = this.mapBallotPayload(ballotData.payload, optionIdMap);

                    await VoteBallot.create(
                        {
                            voteId: vote.id,
                            voterId,
                            payload,
                            recordedAt: DateTime.fromISO(ballotData.recordedAt),
                            revokedAt: ballotData.revokedAt ? DateTime.fromISO(ballotData.revokedAt) : null,
                        },
                        { client: trx }
                    );
                }
            }
        }
    }

    /**
     * Map ballot payload option IDs
     */
    private mapBallotPayload(payload: Record<string, any>, optionIdMap: Map<string, string>): Record<string, any> {
        if (payload.optionId && optionIdMap.has(payload.optionId)) {
            return {
                ...payload,
                optionId: optionIdMap.get(payload.optionId),
            };
        }
        if (payload.optionIds && Array.isArray(payload.optionIds)) {
            return {
                ...payload,
                optionIds: payload.optionIds.map((id: string) => optionIdMap.get(id) || id),
            };
        }
        return payload;
    }

    /**
     * Import mandates
     */
    private async importMandates(mandatesData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        for (const mandateData of mandatesData) {
            const holderUserId = mandateData.holder ? userIdMap.get(mandateData.holder.sourceId) : null;

            await PropositionMandate.create(
                {
                    propositionId,
                    title: mandateData.title,
                    description: mandateData.description,
                    holderUserId: holderUserId || null,
                    status: mandateData.status,
                    targetObjectiveRef: mandateData.targetObjectiveRef,
                    initialDeadline: mandateData.initialDeadline ? DateTime.fromISO(mandateData.initialDeadline) : null,
                    currentDeadline: mandateData.currentDeadline ? DateTime.fromISO(mandateData.currentDeadline) : null,
                    metadata: mandateData.metadata || {},
                },
                { client: trx }
            );
        }
    }

    /**
     * Import comments with proper threading
     */
    private async importComments(commentsData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        const commentIdMap = new Map<string, string>();

        // First pass: create all root comments (no parent)
        for (const commentData of commentsData) {
            if (commentData.parentSourceId) {
                continue; // Skip replies for now
            }

            const authorId = userIdMap.get(commentData.author.sourceId);
            if (!authorId) {
                continue; // Skip if author not resolved
            }

            const comment = await PropositionComment.create(
                {
                    propositionId,
                    authorId,
                    scope: commentData.scope,
                    section: commentData.section,
                    visibility: commentData.visibility,
                    content: commentData.content,
                    createdAt: DateTime.fromISO(commentData.createdAt),
                    updatedAt: DateTime.fromISO(commentData.createdAt),
                },
                { client: trx }
            );

            commentIdMap.set(commentData.sourceId, comment.id);
        }

        // Second pass: create all replies (with parent)
        for (const commentData of commentsData) {
            if (!commentData.parentSourceId) {
                continue; // Skip root comments
            }

            const authorId = userIdMap.get(commentData.author.sourceId);
            if (!authorId) {
                continue; // Skip if author not resolved
            }

            const parentId = commentIdMap.get(commentData.parentSourceId);
            if (!parentId) {
                continue; // Skip if parent not found
            }

            const comment = await PropositionComment.create(
                {
                    propositionId,
                    parentId,
                    authorId,
                    scope: commentData.scope,
                    section: commentData.section,
                    visibility: commentData.visibility,
                    content: commentData.content,
                    createdAt: DateTime.fromISO(commentData.createdAt),
                    updatedAt: DateTime.fromISO(commentData.createdAt),
                },
                { client: trx }
            );

            commentIdMap.set(commentData.sourceId, comment.id);
        }
    }

    /**
     * Import events
     */
    private async importEvents(eventsData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        for (const eventData of eventsData) {
            const createdByUserId = eventData.createdBy ? userIdMap.get(eventData.createdBy.sourceId) : null;

            await PropositionEvent.create(
                {
                    propositionId,
                    type: eventData.type,
                    title: eventData.title,
                    description: eventData.description,
                    startAt: eventData.startAt ? DateTime.fromISO(eventData.startAt) : null,
                    endAt: eventData.endAt ? DateTime.fromISO(eventData.endAt) : null,
                    location: eventData.location,
                    videoLink: eventData.videoLink,
                    createdByUserId: createdByUserId || null,
                    createdAt: DateTime.fromISO(eventData.createdAt),
                    updatedAt: DateTime.fromISO(eventData.createdAt),
                },
                { client: trx }
            );
        }
    }

    /**
     * Import reactions
     */
    private async importReactions(reactionsData: any[], propositionId: string, userIdMap: Map<string, string>, trx: TransactionClientContract): Promise<void> {
        for (const reactionData of reactionsData) {
            const authorId = userIdMap.get(reactionData.author.sourceId);
            if (!authorId) {
                continue; // Skip if author not resolved
            }

            await PropositionReaction.create(
                {
                    propositionId,
                    authorId,
                    type: reactionData.type,
                    createdAt: DateTime.fromISO(reactionData.createdAt),
                },
                { client: trx }
            );
        }
    }

    /**
     * Import a file
     */
    private async importFile(fileRef: ExportedFileReference, fileType: FileTypeEnum, fileIdMap: Map<string, string>, result: ImportResult, trx: TransactionClientContract): Promise<File> {
        // Decode the base64 file
        const buffer = Buffer.from(fileRef.data, 'base64');

        // Generate a new filename
        const sanitizedName = `${cuid()}-${fileRef.name}`;
        const key = fileType === FileTypeEnum.PROPOSITION_VISUAL ? `propositions/visuals/${sanitizedName}` : `propositions/attachments/${sanitizedName}`;

        // Save in storage
        await this.fileService.saveBuffer(buffer, key, fileRef.mimeType);

        // Créer l'entrée DB
        const file = await File.create(
            {
                name: sanitizedName,
                path: key,
                extension: fileRef.extension,
                mimeType: fileRef.mimeType,
                size: fileRef.size,
                type: fileType,
            },
            { client: trx }
        );

        fileIdMap.set(fileRef.sourceId, file.id);
        result.summary.filesUploaded++;

        return file;
    }

    /**
     * Create proposition associations
     */
    private async createPropositionAssociations(
        propositions: ExportedProposition[],
        configuration: ImportConfiguration,
        propositionIdMap: Map<string, string>,
        trx: TransactionClientContract
    ): Promise<void> {
        for (const exportedProp of propositions) {
            const propositionId = propositionIdMap.get(exportedProp.sourceId);
            if (!propositionId) {
                continue; // Proposition skipped
            }

            const associatedIds: string[] = [];

            for (const assocRef of exportedProp.externalReferences.associatedPropositions) {
                // Search in the import map
                const assocId = propositionIdMap.get(assocRef.sourceId);

                if (assocId) {
                    associatedIds.push(assocId);
                } else {
                    // Search via conflict resolution
                    const resolution = this.findResolution(configuration, assocRef.sourceId, 'associatedPropositions');

                    if (resolution && resolution.mappedId) {
                        associatedIds.push(resolution.mappedId);
                    }
                }
            }

            // Create the associations
            if (associatedIds.length > 0) {
                const associationRows = associatedIds.map((assocId) => ({
                    proposition_id: propositionId,
                    related_proposition_id: assocId,
                }));

                const reciprocalRows = associatedIds.map((assocId) => ({
                    proposition_id: assocId,
                    related_proposition_id: propositionId,
                }));

                await trx.insertQuery().table('proposition_associations').insert(associationRows);
                await trx.insertQuery().table('proposition_associations').insert(reciprocalRows);
            }
        }
    }

    /**
     * Find a resolution in the configuration
     */
    private findResolution(configuration: ImportConfiguration, sourceId: string, field: string): any {
        for (const resolution of configuration.resolutions) {
            const conflict = configuration.importId && this.analyzerService.getImportSession(configuration.importId);

            if (!conflict) {
                continue;
            }

            const matchingConflict = conflict.conflictReport?.conflicts[resolution.conflictIndex];

            if (matchingConflict && (matchingConflict.reference.sourceId === sourceId || matchingConflict.field === field)) {
                return resolution;
            }
        }

        return null;
    }
}
