import { inject } from '@adonisjs/core';
import User from '#models/user';
import Proposition from '#models/proposition';
import PropositionCategory from '#models/proposition_category';
import { cuid } from '@adonisjs/core/helpers';
import { ExportData, ExportedProposition, ConflictReport, ImportConflict, ConflictType, ConflictSeverity, ResolutionStrategy, ImportSession } from '#types/import_export_types';

@inject()
export default class PropositionImportAnalyzerService {
    private sessions: Map<string, ImportSession> = new Map();
    private readonly SESSION_EXPIRY_MS = 3600000; // 1 heure

    /**
     * Analyze an import file and detect conflicts
     */
    public async analyzeImport(exportData: ExportData, importerId: string): Promise<ConflictReport> {
        const conflicts: ImportConflict[] = [];
        const validationErrors: string[] = [];

        // Validation du format
        if (exportData.exportVersion !== '1.0') {
            validationErrors.push(`Version d'export non supportée: ${exportData.exportVersion}. Version attendue: 1.0`);
        }

        if (!exportData.propositions || exportData.propositions.length === 0) {
            validationErrors.push("Aucune proposition trouvée dans le fichier d'import");
        }

        // Analyser chaque proposition
        let newCount = 0;
        let existingCount = 0;

        for (let i = 0; i < exportData.propositions.length; i++) {
            const proposition = exportData.propositions[i];

            // Check if the proposition already exists
            const existingProposition = await this.findExistingProposition(proposition);

            if (existingProposition) {
                existingCount++;
                // Conflit: proposition existante
                conflicts.push({
                    type: ConflictType.DUPLICATE_PROPOSITION,
                    severity: ConflictSeverity.WARNING,
                    reference: {
                        sourceId: proposition.sourceId,
                        title: proposition.title,
                        existingId: existingProposition.id,
                    },
                    propositionIndex: i,
                    field: 'proposition',
                    message: `La proposition "${proposition.title}" existe déjà dans l'environnement`,
                    resolutions: [
                        {
                            strategy: ResolutionStrategy.MERGE,
                            label: 'Fusionner avec la proposition existante',
                            preview: await this.generateMergePreview(proposition, existingProposition),
                        },
                        {
                            strategy: ResolutionStrategy.CREATE_NEW,
                            label: 'Créer une nouvelle proposition (doublon)',
                        },
                        {
                            strategy: ResolutionStrategy.SKIP,
                            label: 'Ignorer cette proposition',
                        },
                    ],
                });
            } else {
                newCount++;
            }

            // Check the creator
            const creatorConflict = await this.checkUserReference(proposition.externalReferences.creator, i, 'creator');
            if (creatorConflict) conflicts.push(creatorConflict);

            // Check rescue initiators
            for (const initiator of proposition.externalReferences.rescueInitiators) {
                const initiatorConflict = await this.checkUserReference(initiator, i, 'rescueInitiator');
                if (initiatorConflict) conflicts.push(initiatorConflict);
            }

            // Check categories
            for (const category of proposition.externalReferences.categories) {
                const categoryConflict = await this.checkCategoryReference(category, i);
                if (categoryConflict) conflicts.push(categoryConflict);
            }

            // Check associated propositions
            for (const associatedProp of proposition.externalReferences.associatedPropositions) {
                const assocConflict = await this.checkAssociatedProposition(associatedProp, i, exportData.propositions);
                if (assocConflict) conflicts.push(assocConflict);
            }

            // Data validation
            if (!proposition.title || proposition.title.trim().length === 0) {
                validationErrors.push(`Proposition #${i + 1}: le titre est requis`);
            }

            if (proposition.title && proposition.title.length > 150) {
                validationErrors.push(`Proposition #${i + 1} "${proposition.title}": le titre dépasse 150 caractères`);
            }
        }

        // Create the report
        const importId = cuid();
        const report: ConflictReport = {
            importId,
            summary: {
                totalPropositions: exportData.propositions.length,
                newPropositions: newCount,
                existingPropositions: existingCount,
                conflicts: conflicts.length,
            },
            conflicts,
            validationErrors,
        };

        // Save the import session
        this.saveImportSession(importId, importerId, exportData, report);

        return report;
    }

    /**
     * Find an existing proposition by title and creator (heuristic)
     */
    private async findExistingProposition(exportedProposition: ExportedProposition): Promise<Proposition | null> {
        // Search by exact title
        const propositions = await Proposition.query().where('title', exportedProposition.title).preload('creator');

        if (propositions.length === 0) {
            return null;
        }

        // If single result, it's probably a duplicate
        if (propositions.length === 1) {
            return propositions[0];
        }

        // If multiple, try to match by creator
        for (const prop of propositions) {
            if (prop.creator.email === exportedProposition.externalReferences.creator.email || prop.creator.username === exportedProposition.externalReferences.creator.username) {
                return prop;
            }
        }

        // Otherwise return the first
        return propositions[0];
    }

    /**
     * Check a user reference
     */
    private async checkUserReference(userRef: any, propositionIndex: number, field: string): Promise<ImportConflict | null> {
        // Search for user by email or username
        const existingUser = await User.query().where('email', userRef.email).orWhere('username', userRef.username).first();

        if (!existingUser) {
            // Utilisateur manquant
            return {
                type: ConflictType.MISSING_USER,
                severity: ConflictSeverity.ERROR,
                reference: userRef,
                propositionIndex,
                field,
                message: `Utilisateur "${userRef.username}" (${userRef.email}) introuvable`,
                resolutions: [
                    {
                        strategy: ResolutionStrategy.CREATE_NEW,
                        label: 'Créer un nouvel utilisateur',
                        requiresInput: true,
                        fields: ['username', 'email', 'password'],
                    },
                    {
                        strategy: ResolutionStrategy.MAP_EXISTING,
                        label: 'Mapper sur un utilisateur existant',
                        options: await this.getUserOptions(),
                    },
                    {
                        strategy: ResolutionStrategy.SKIP,
                        label: 'Ignorer cette proposition',
                    },
                ],
            };
        }

        // Check if email/username matches exactly
        if (existingUser.email !== userRef.email || existingUser.username !== userRef.username) {
            // Partial match - suggest mapping
            return {
                type: ConflictType.MISSING_USER,
                severity: ConflictSeverity.WARNING,
                reference: userRef,
                propositionIndex,
                field,
                message: `Utilisateur "${userRef.username}" trouvé mais avec des différences`,
                resolutions: [
                    {
                        strategy: ResolutionStrategy.MAP_EXISTING,
                        label: `Mapper sur "${existingUser.username}" (${existingUser.email})`,
                        options: [
                            {
                                id: existingUser.id,
                                label: `${existingUser.username} - ${existingUser.email}`,
                            },
                        ],
                    },
                    {
                        strategy: ResolutionStrategy.CREATE_NEW,
                        label: 'Créer un nouvel utilisateur',
                        requiresInput: true,
                        fields: ['username', 'email', 'password'],
                    },
                ],
            };
        }

        return null;
    }

    /**
     * Check a category reference
     */
    private async checkCategoryReference(categoryRef: any, propositionIndex: number): Promise<ImportConflict | null> {
        const existingCategory = await PropositionCategory.query().where('name', categoryRef.name).first();

        if (!existingCategory) {
            return {
                type: ConflictType.MISSING_CATEGORY,
                severity: ConflictSeverity.WARNING,
                reference: categoryRef,
                propositionIndex,
                field: 'categories',
                message: `Catégorie "${categoryRef.name}" introuvable`,
                resolutions: [
                    {
                        strategy: ResolutionStrategy.CREATE_NEW,
                        label: `Créer la catégorie "${categoryRef.name}"`,
                    },
                    {
                        strategy: ResolutionStrategy.MAP_EXISTING,
                        label: 'Mapper sur une catégorie existante',
                        options: await this.getCategoryOptions(),
                    },
                    {
                        strategy: ResolutionStrategy.REMOVE,
                        label: 'Ne pas associer de catégorie',
                    },
                ],
            };
        }

        return null;
    }

    /**
     * Check an associated proposition
     */
    private async checkAssociatedProposition(associatedRef: any, propositionIndex: number, allExportedPropositions: ExportedProposition[]): Promise<ImportConflict | null> {
        // Check if the associated proposition is in the same export
        const isInExport = allExportedPropositions.some((p) => p.sourceId === associatedRef.sourceId);

        if (isInExport) {
            // OK, will be imported at the same time
            return null;
        }

        // Search in existing propositions
        const existingProposition = await Proposition.query().where('title', associatedRef.title).first();

        if (!existingProposition) {
            return {
                type: ConflictType.MISSING_ASSOCIATED_PROPOSITION,
                severity: ConflictSeverity.WARNING,
                reference: associatedRef,
                propositionIndex,
                field: 'associatedPropositions',
                message: `Proposition associée "${associatedRef.title}" introuvable`,
                resolutions: [
                    {
                        strategy: ResolutionStrategy.MAP_EXISTING,
                        label: 'Mapper sur une proposition existante',
                        options: await this.getPropositionOptions(),
                    },
                    {
                        strategy: ResolutionStrategy.REMOVE,
                        label: "Ne pas créer d'association",
                    },
                ],
            };
        }

        return null;
    }

    /**
     * Generate a merge preview
     */
    private async generateMergePreview(incoming: ExportedProposition, current: Proposition): Promise<any> {
        await current.load('categories');

        const changes = [];

        if (incoming.summary !== current.summary) {
            changes.push({
                field: 'summary',
                current: current.summary,
                incoming: incoming.summary,
                action: 'REVIEW_REQUIRED',
            });
        }

        if (incoming.detailedDescription !== current.detailedDescription) {
            changes.push({
                field: 'detailedDescription',
                current: current.detailedDescription,
                incoming: incoming.detailedDescription,
                action: 'REVIEW_REQUIRED',
            });
        }

        if (incoming.smartObjectives !== current.smartObjectives) {
            changes.push({
                field: 'smartObjectives',
                current: current.smartObjectives,
                incoming: incoming.smartObjectives,
                action: 'REVIEW_REQUIRED',
            });
        }

        const currentCategoryNames = current.categories?.map((c) => c.name).sort() || [];
        const incomingCategoryNames = incoming.externalReferences.categories.map((c) => c.name).sort();

        if (JSON.stringify(currentCategoryNames) !== JSON.stringify(incomingCategoryNames)) {
            changes.push({
                field: 'categories',
                current: currentCategoryNames,
                incoming: incomingCategoryNames,
                action: 'REVIEW_REQUIRED',
            });
        }

        return { changes };
    }

    /**
     * Get user options for mapping
     */
    private async getUserOptions(): Promise<Array<{ id: string; label: string }>> {
        const users = await User.query().where('enabled', true).orderBy('username', 'asc').limit(50);

        return users.map((user) => ({
            id: user.id,
            label: `${user.username} - ${user.email}`,
        }));
    }

    /**
     * Get category options for mapping
     */
    private async getCategoryOptions(): Promise<Array<{ id: string; label: string; name: string }>> {
        const categories = await PropositionCategory.query().orderBy('name', 'asc');

        return categories.map((cat) => ({
            id: cat.id,
            label: cat.name,
            name: cat.name,
        }));
    }

    /**
     * Get proposition options for mapping
     */
    private async getPropositionOptions(): Promise<Array<{ id: string; label: string }>> {
        const propositions = await Proposition.query().whereNotIn('status', ['ARCHIVED']).orderBy('created_at', 'desc').limit(100);

        return propositions.map((prop) => ({
            id: prop.id,
            label: `${prop.title} (${prop.status})`,
        }));
    }

    /**
     * Save an import session
     */
    private saveImportSession(importId: string, userId: string, exportData: ExportData, conflictReport: ConflictReport): void {
        const session: ImportSession = {
            id: importId,
            userId,
            exportData,
            conflictReport,
            configuration: null,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_MS),
        };

        this.sessions.set(importId, session);

        // Clean expired sessions
        this.cleanExpiredSessions();
    }

    /**
     * Get an import session
     */
    public getImportSession(importId: string): ImportSession | null {
        const session = this.sessions.get(importId);

        if (!session) {
            return null;
        }

        if (session.expiresAt < new Date()) {
            this.sessions.delete(importId);
            return null;
        }

        return session;
    }

    /**
     * Update session configuration
     */
    public updateSessionConfiguration(importId: string, configuration: any): void {
        const session = this.sessions.get(importId);

        if (session) {
            session.configuration = configuration;
        }
    }

    /**
     * Clean expired sessions
     */
    private cleanExpiredSessions(): void {
        const now = new Date();

        for (const [id, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(id);
            }
        }
    }
}
