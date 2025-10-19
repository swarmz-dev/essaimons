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

@inject()
export default class PropositionImportExecutorService {
    constructor(
        private readonly analyzerService: PropositionImportAnalyzerService,
        private readonly fileService: FileService,
        private readonly workflowService: PropositionWorkflowService
    ) {}

    /**
     * Exécute l'import avec la configuration fournie
     */
    public async executeImport(configuration: ImportConfiguration, executor: User): Promise<ImportResult> {
        // Récupérer la session d'import
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

        // Maps pour garder trace des IDs source -> IDs cible
        const userIdMap = new Map<string, string>();
        const categoryIdMap = new Map<string, string>();
        const propositionIdMap = new Map<string, string>();
        const fileIdMap = new Map<string, string>();

        // Créer une transaction globale
        const trx: TransactionClientContract = await db.transaction();

        try {
            // Phase 1: Résoudre tous les utilisateurs
            await this.resolveUsers(session.exportData.propositions, configuration, userIdMap, result, trx);

            // Phase 2: Résoudre toutes les catégories
            await this.resolveCategories(session.exportData.propositions, configuration, categoryIdMap, result, trx);

            // Phase 3: Importer les propositions
            for (let i = 0; i < session.exportData.propositions.length; i++) {
                const exportedProposition = session.exportData.propositions[i];

                try {
                    const detailResult = await this.importProposition(exportedProposition, i, configuration, userIdMap, categoryIdMap, propositionIdMap, fileIdMap, result, executor, trx);

                    result.details.push(detailResult);
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

            // Phase 4: Créer les associations entre propositions
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
     * Résout tous les utilisateurs référencés
     */
    private async resolveUsers(
        propositions: ExportedProposition[],
        configuration: ImportConfiguration,
        userIdMap: Map<string, string>,
        result: ImportResult,
        trx: TransactionClientContract
    ): Promise<void> {
        const allUserRefs = new Map<string, ExportedUserReference>();

        // Collecter toutes les références utilisateur uniques
        for (const prop of propositions) {
            allUserRefs.set(prop.externalReferences.creator.sourceId, prop.externalReferences.creator);

            for (const initiator of prop.externalReferences.rescueInitiators) {
                allUserRefs.set(initiator.sourceId, initiator);
            }
        }

        // Résoudre chaque utilisateur
        for (const [sourceId, userRef] of allUserRefs) {
            const resolution = this.findResolution(configuration, userRef.sourceId, 'creator');

            if (resolution) {
                if (resolution.strategy === ResolutionStrategy.CREATE_NEW) {
                    // Créer un nouvel utilisateur
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
                    // Mapper sur un utilisateur existant
                    if (resolution.mappedId) {
                        userIdMap.set(sourceId, resolution.mappedId);
                    }
                }
            } else {
                // Essayer de trouver automatiquement
                const existingUser = await User.query({ client: trx }).where('email', userRef.email).orWhere('username', userRef.username).first();

                if (existingUser) {
                    userIdMap.set(sourceId, existingUser.id);
                }
            }
        }
    }

    /**
     * Résout toutes les catégories référencées
     */
    private async resolveCategories(
        propositions: ExportedProposition[],
        configuration: ImportConfiguration,
        categoryIdMap: Map<string, string>,
        result: ImportResult,
        trx: TransactionClientContract
    ): Promise<void> {
        const allCategoryRefs = new Map<string, ExportedCategoryReference>();

        // Collecter toutes les références catégorie uniques
        for (const prop of propositions) {
            for (const cat of prop.externalReferences.categories) {
                allCategoryRefs.set(cat.sourceId, cat);
            }
        }

        // Résoudre chaque catégorie
        for (const [sourceId, catRef] of allCategoryRefs) {
            const resolution = this.findResolution(configuration, sourceId, 'categories');

            if (resolution) {
                if (resolution.strategy === ResolutionStrategy.CREATE_NEW) {
                    // Créer une nouvelle catégorie
                    const newCategory = await PropositionCategory.create(
                        {
                            name: catRef.name,
                        },
                        { client: trx }
                    );

                    categoryIdMap.set(sourceId, newCategory.id);
                    result.summary.categoriesCreated++;
                } else if (resolution.strategy === ResolutionStrategy.MAP_EXISTING) {
                    // Mapper sur une catégorie existante
                    if (resolution.mappedId) {
                        categoryIdMap.set(sourceId, resolution.mappedId);
                    }
                }
            } else {
                // Essayer de trouver automatiquement
                const existingCategory = await PropositionCategory.query({ client: trx }).where('name', catRef.name).first();

                if (existingCategory) {
                    categoryIdMap.set(sourceId, existingCategory.id);
                } else {
                    // Auto-créer si pas de résolution spécifiée
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
     * Importe une proposition
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

        // Vérifier si skip
        if (resolution && resolution.strategy === ResolutionStrategy.SKIP) {
            result.summary.propositionsSkipped++;
            return {
                sourceId: exportedProp.sourceId,
                targetId: null,
                action: 'SKIPPED',
                warnings: [],
            };
        }

        // Résoudre le créateur
        const creatorId = userIdMap.get(exportedProp.externalReferences.creator.sourceId);
        if (!creatorId) {
            throw new Error(`Créateur non résolu pour la proposition "${exportedProp.title}"`);
        }

        const creator = await User.findOrFail(creatorId, { client: trx });

        // Résoudre les catégories
        const categoryIds: string[] = [];
        for (const catRef of exportedProp.externalReferences.categories) {
            const catId = categoryIdMap.get(catRef.sourceId);
            if (catId) {
                categoryIds.push(catId);
            }
        }

        // Résoudre les rescue initiators
        const rescueInitiatorIds: string[] = [];
        for (const initiatorRef of exportedProp.externalReferences.rescueInitiators) {
            const userId = userIdMap.get(initiatorRef.sourceId);
            if (userId) {
                rescueInitiatorIds.push(userId);
            }
        }

        // Importer les fichiers
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

        // Créer ou fusionner la proposition
        if (resolution && resolution.strategy === ResolutionStrategy.MERGE && resolution.mappedId) {
            // Fusionner avec une proposition existante
            const existingProp = await Proposition.findOrFail(resolution.mappedId, { client: trx });
            existingProp.useTransaction(trx);

            // Appliquer les champs selon fieldResolutions
            if (resolution.fieldResolutions) {
                for (const fieldRes of resolution.fieldResolutions) {
                    if (fieldRes.action === MergeAction.KEEP_INCOMING) {
                        // Appliquer la valeur importée
                        const value = (exportedProp as any)[fieldRes.field];
                        if (value !== undefined) {
                            (existingProp as any)[fieldRes.field] = value;
                        }
                    }
                    // KEEP_CURRENT: ne rien faire
                    // MERGE_BOTH: pour les catégories notamment
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
            // Créer une nouvelle proposition
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
                },
                { client: trx }
            );

            proposition.useTransaction(trx);

            // Associer les catégories
            if (categories.length > 0) {
                await proposition.related('categories').attach(categories.map((c) => c.id));
            }

            // Associer les rescue initiators
            if (rescueUsers.length > 0) {
                await proposition.related('rescueInitiators').attach(rescueUsers.map((u) => u.id));
            }

            // Associer les attachments
            if (attachmentFileIds.length > 0) {
                await proposition.related('attachments').attach(attachmentFileIds);
            }

            // Enregistrer l'historique initial
            await this.workflowService.recordInitialHistory(proposition, creator, trx);

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
     * Importe un fichier
     */
    private async importFile(fileRef: ExportedFileReference, fileType: FileTypeEnum, fileIdMap: Map<string, string>, result: ImportResult, trx: TransactionClientContract): Promise<File> {
        // Décoder le fichier base64
        const buffer = Buffer.from(fileRef.data, 'base64');

        // Générer un nouveau nom de fichier
        const sanitizedName = `${cuid()}-${fileRef.name}`;
        const key = fileType === FileTypeEnum.PROPOSITION_VISUAL ? `propositions/visuals/${sanitizedName}` : `propositions/attachments/${sanitizedName}`;

        // Sauvegarder dans le storage
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
     * Crée les associations entre propositions
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
                // Chercher dans le map d'import
                const assocId = propositionIdMap.get(assocRef.sourceId);

                if (assocId) {
                    associatedIds.push(assocId);
                } else {
                    // Chercher via résolution de conflit
                    const resolution = this.findResolution(configuration, assocRef.sourceId, 'associatedPropositions');

                    if (resolution && resolution.mappedId) {
                        associatedIds.push(resolution.mappedId);
                    }
                }
            }

            // Créer les associations
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
     * Trouve une résolution dans la configuration
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
