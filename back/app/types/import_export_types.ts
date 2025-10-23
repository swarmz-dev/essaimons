/**
 * Types pour l'import/export de propositions
 */

import { PropositionStatusEnum } from './enum/proposition_status_enum.js';
import { PropositionVisibilityEnum } from './enum/proposition_visibility_enum.js';

/**
 * Format d'export d'une proposition
 */
export interface ExportedProposition {
    // Données de base
    sourceId: string;
    title: string;
    summary: string;
    detailedDescription: string | null;
    smartObjectives: string | null;
    impacts: string | null;
    mandatesDescription: string | null;
    expertise: string | null;

    // Statut et visibilité
    status: PropositionStatusEnum;
    statusStartedAt: string;
    visibility: PropositionVisibilityEnum;
    archivedAt: string | null;

    // Deadlines
    clarificationDeadline: string | null;
    amendmentDeadline: string | null;
    voteDeadline: string | null;
    mandateDeadline: string | null;
    evaluationDeadline: string | null;

    // Settings snapshot
    settingsSnapshot: Record<string, any> | null;

    // Timestamps
    createdAt: string;
    updatedAt: string;

    // Références externes
    externalReferences: {
        creator: ExportedUserReference;
        categories: ExportedCategoryReference[];
        rescueInitiators: ExportedUserReference[];
        visual: ExportedFileReference | null;
        attachments: ExportedFileReference[];
        associatedPropositions: ExportedPropositionReference[];
    };

    // Données enrichies (optionnel)
    statusHistory?: ExportedStatusHistory[];
    votes?: ExportedVote[];
    mandates?: ExportedMandate[];
    comments?: ExportedComment[];
    events?: ExportedEvent[];
    reactions?: ExportedReaction[];
}

/**
 * Référence vers un utilisateur exporté
 */
export interface ExportedUserReference {
    sourceId: string;
    username: string;
    email: string;
    displayName: string | null;
    role: string;
}

/**
 * Référence vers une catégorie exportée
 */
export interface ExportedCategoryReference {
    sourceId: string;
    name: string;
}

/**
 * Référence vers un fichier exporté
 */
export interface ExportedFileReference {
    sourceId: string;
    name: string;
    extension: string;
    mimeType: string;
    size: number;
    // Contenu du fichier encodé en base64
    data: string;
}

/**
 * Référence vers une proposition associée
 */
export interface ExportedPropositionReference {
    sourceId: string;
    title: string;
}

/**
 * Historique de statut exporté
 */
export interface ExportedStatusHistory {
    fromStatus: PropositionStatusEnum | null;
    toStatus: PropositionStatusEnum;
    triggeredBy: ExportedUserReference | null;
    reason: string | null;
    metadata: Record<string, any> | null;
    createdAt: string;
}

/**
 * Vote exporté
 */
export interface ExportedVote {
    sourceId: string;
    phase: string;
    method: string;
    title: string | null;
    description: string | null;
    openAt: string | null;
    closeAt: string | null;
    maxSelections: number | null;
    status: string;
    metadata: Record<string, any> | null;
    options: ExportedVoteOption[];
    ballots?: ExportedVoteBallot[];
}

export interface ExportedVoteOption {
    sourceId: string;
    label: string | null;
    description: string | null;
    position: number;
    metadata: Record<string, any> | null;
}

export interface ExportedVoteBallot {
    voter: ExportedUserReference;
    payload: Record<string, any>;
    recordedAt: string;
    revokedAt: string | null;
}

/**
 * Mandat exporté
 */
export interface ExportedMandate {
    sourceId: string;
    title: string | null;
    description: string | null;
    holder: ExportedUserReference | null;
    status: string;
    targetObjectiveRef: string | null;
    initialDeadline: string | null;
    currentDeadline: string | null;
    metadata: Record<string, any> | null;
}

/**
 * Commentaire exporté
 */
export interface ExportedComment {
    sourceId: string;
    parentSourceId: string | null;
    author: ExportedUserReference;
    scope: string;
    section: string | null;
    visibility: string;
    content: string;
    createdAt: string;
}

/**
 * Événement exporté
 */
export interface ExportedEvent {
    sourceId: string;
    type: string;
    title: string | null;
    description: string | null;
    startAt: string | null;
    endAt: string | null;
    location: string | null;
    videoLink: string | null;
    createdBy: ExportedUserReference | null;
    createdAt: string;
}

/**
 * Réaction exportée
 */
export interface ExportedReaction {
    author: ExportedUserReference;
    type: string;
    createdAt: string;
}

/**
 * Fichier d'export complet
 */
export interface ExportData {
    exportVersion: string;
    exportedAt: string;
    exportedBy: {
        userId: string;
        username: string;
        email: string;
    };
    sourceEnvironment: {
        name: string;
        instanceId?: string;
    };
    propositions: ExportedProposition[];
}

/**
 * Options d'export
 */
export interface ExportOptions {
    includeStatusHistory?: boolean;
    includeVotes?: boolean;
    includeBallots?: boolean;
    includeMandates?: boolean;
    includeComments?: boolean;
    includeEvents?: boolean;
    includeReactions?: boolean;
}

/**
 * Types de conflits possibles lors de l'import
 */
export enum ConflictType {
    MISSING_USER = 'MISSING_USER',
    MISSING_CATEGORY = 'MISSING_CATEGORY',
    DUPLICATE_PROPOSITION = 'DUPLICATE_PROPOSITION',
    MISSING_ASSOCIATED_PROPOSITION = 'MISSING_ASSOCIATED_PROPOSITION',
    INVALID_DATA = 'INVALID_DATA',
}

/**
 * Sévérité d'un conflit
 */
export enum ConflictSeverity {
    ERROR = 'ERROR', // Bloque l'import
    WARNING = 'WARNING', // Nécessite une décision
    INFO = 'INFO', // Informatif uniquement
}

/**
 * Stratégies de résolution possibles
 */
export enum ResolutionStrategy {
    CREATE_NEW = 'CREATE_NEW',
    MAP_EXISTING = 'MAP_EXISTING',
    MERGE = 'MERGE',
    SKIP = 'SKIP',
    REMOVE = 'REMOVE',
}

/**
 * Actions pour les champs lors d'une fusion
 */
export enum MergeAction {
    KEEP_INCOMING = 'KEEP_INCOMING',
    KEEP_CURRENT = 'KEEP_CURRENT',
    MERGE_BOTH = 'MERGE_BOTH',
    SKIP = 'SKIP',
}

/**
 * Option de résolution
 */
export interface ResolutionOption {
    strategy: ResolutionStrategy;
    label: string;
    requiresInput?: boolean;
    fields?: string[];
    options?: Array<{
        id: string;
        label: string;
        [key: string]: any;
    }>;
    preview?: MergePreview;
}

/**
 * Aperçu d'une fusion
 */
export interface MergePreview {
    changes: Array<{
        field: string;
        current: any;
        incoming: any;
        action: MergeAction | 'REVIEW_REQUIRED';
    }>;
}

/**
 * Conflit détecté
 */
export interface ImportConflict {
    type: ConflictType;
    severity: ConflictSeverity;
    reference: any;
    propositionIndex: number;
    field: string;
    message?: string;
    resolutions: ResolutionOption[];
}

/**
 * Rapport d'analyse d'import
 */
export interface ConflictReport {
    importId: string;
    summary: {
        totalPropositions: number;
        newPropositions: number;
        existingPropositions: number;
        conflicts: number;
    };
    conflicts: ImportConflict[];
    validationErrors: string[];
}

/**
 * Résolution d'un conflit par l'utilisateur
 */
export interface ConflictResolution {
    conflictIndex: number;
    strategy: ResolutionStrategy;
    mappedId?: string;
    createData?: Record<string, any>;
    fieldResolutions?: Array<{
        field: string;
        action: MergeAction;
    }>;
}

/**
 * Configuration complète d'un import
 */
export interface ImportConfiguration {
    importId: string;
    resolutions: ConflictResolution[];
}

/**
 * Résultat de l'exécution d'un import
 */
export interface ImportResult {
    success: boolean;
    summary: {
        propositionsCreated: number;
        propositionsMerged: number;
        propositionsSkipped: number;
        usersCreated: number;
        categoriesCreated: number;
        filesUploaded: number;
    };
    details: Array<{
        sourceId: string;
        targetId: string | null;
        action: 'CREATED' | 'MERGED' | 'SKIPPED' | 'FAILED';
        warnings: string[];
        error?: string;
    }>;
    errors: string[];
}

/**
 * Session d'import temporaire
 */
export interface ImportSession {
    id: string;
    userId: string;
    exportData: ExportData;
    conflictReport: ConflictReport | null;
    configuration: ImportConfiguration | null;
    createdAt: Date;
    expiresAt: Date;
}
