import { inject } from '@adonisjs/core';
import Proposition from '#models/proposition';
import User from '#models/user';
import File from '#models/file';
import FileService from '#services/file_service';
import type {
    ExportData,
    ExportedProposition,
    ExportedUserReference,
    ExportedCategoryReference,
    ExportedFileReference,
    ExportedPropositionReference,
    ExportedStatusHistory,
    ExportedVote,
    ExportedVoteOption,
    ExportedVoteBallot,
    ExportedMandate,
    ExportedComment,
    ExportedEvent,
    ExportedReaction,
    ExportOptions,
} from '#types/import_export_types';

@inject()
export default class PropositionExportService {
    constructor(private readonly fileService: FileService) {}

    /**
     * Exporte une ou plusieurs propositions au format JSON
     */
    public async exportPropositions(propositions: Proposition[], exporter: User, options: ExportOptions = {}): Promise<ExportData> {
        const exportedPropositions: ExportedProposition[] = [];

        for (const proposition of propositions) {
            // Charger toutes les relations nécessaires
            await this.loadPropositionRelations(proposition, options);

            const exportedProposition = await this.serializeProposition(proposition, options);
            exportedPropositions.push(exportedProposition);
        }

        return {
            exportVersion: '1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: {
                userId: exporter.id,
                username: exporter.username,
                email: exporter.email,
            },
            sourceEnvironment: {
                name: process.env.APP_NAME || 'Essaimons',
                instanceId: process.env.INSTANCE_ID,
            },
            propositions: exportedPropositions,
        };
    }

    /**
     * Charge toutes les relations nécessaires pour l'export
     */
    private async loadPropositionRelations(proposition: Proposition, options: ExportOptions): Promise<void> {
        const relations: string[] = ['creator', 'categories', 'rescueInitiators', 'associatedPropositions', 'attachments'];

        if (proposition.visualFileId) {
            relations.push('visual');
        }

        if (options.includeStatusHistory) {
            relations.push('statusHistory', 'statusHistory.triggeredBy');
        }

        if (options.includeVotes) {
            relations.push('votes', 'votes.options');
            if (options.includeBallots) {
                relations.push('votes.ballots', 'votes.ballots.voter');
            }
        }

        if (options.includeMandates) {
            relations.push('mandates', 'mandates.holder');
        }

        if (options.includeComments) {
            relations.push('comments', 'comments.author');
        }

        if (options.includeEvents) {
            relations.push('events', 'events.createdBy');
        }

        if (options.includeReactions) {
            relations.push('reactions', 'reactions.author');
        }

        await proposition.load((loader) => {
            for (const relation of relations) {
                const parts = relation.split('.');
                if (parts.length === 1) {
                    loader.load(parts[0] as any);
                } else if (parts.length === 2) {
                    loader.load(parts[0] as any, (query) => {
                        query.preload(parts[1] as any);
                    });
                } else if (parts.length === 3) {
                    loader.load(parts[0] as any, (query: any) => {
                        query.preload(parts[1] as any, (subQuery: any) => {
                            subQuery.preload(parts[2] as any);
                        });
                    });
                }
            }
        });
    }

    /**
     * Sérialise une proposition complète
     */
    private async serializeProposition(proposition: Proposition, options: ExportOptions): Promise<ExportedProposition> {
        const exported: ExportedProposition = {
            sourceId: proposition.id,
            title: proposition.title,
            summary: proposition.summary,
            detailedDescription: proposition.detailedDescription,
            smartObjectives: proposition.smartObjectives,
            impacts: proposition.impacts,
            mandatesDescription: proposition.mandatesDescription,
            expertise: proposition.expertise ?? null,
            status: proposition.status,
            statusStartedAt: proposition.statusStartedAt.toISO()!,
            visibility: proposition.visibility,
            archivedAt: proposition.archivedAt?.toISO() ?? null,
            clarificationDeadline: proposition.clarificationDeadline?.toISODate() ?? null,
            amendmentDeadline: proposition.amendmentDeadline?.toISODate() ?? null,
            voteDeadline: proposition.voteDeadline?.toISODate() ?? null,
            mandateDeadline: proposition.mandateDeadline?.toISODate() ?? null,
            evaluationDeadline: proposition.evaluationDeadline?.toISODate() ?? null,
            settingsSnapshot: proposition.settingsSnapshot,
            createdAt: proposition.createdAt.toISO()!,
            updatedAt: proposition.updatedAt.toISO()!,
            externalReferences: {
                creator: this.serializeUserReference(proposition.creator),
                categories: proposition.categories?.map((cat) => this.serializeCategoryReference(cat)) ?? [],
                rescueInitiators: proposition.rescueInitiators?.map((user) => this.serializeUserReference(user)) ?? [],
                visual: proposition.visual ? await this.serializeFileReference(proposition.visual) : null,
                attachments: await Promise.all((proposition.attachments ?? []).map((file) => this.serializeFileReference(file))),
                associatedPropositions: proposition.associatedPropositions?.map((prop) => this.serializePropositionReference(prop)) ?? [],
            },
        };

        // Ajouter les données enrichies selon les options
        if (options.includeStatusHistory && proposition.statusHistory) {
            exported.statusHistory = proposition.statusHistory.map((history) => this.serializeStatusHistory(history));
        }

        if (options.includeVotes && proposition.votes) {
            exported.votes = proposition.votes.map((vote) => this.serializeVote(vote, options.includeBallots ?? false));
        }

        if (options.includeMandates && proposition.mandates) {
            exported.mandates = proposition.mandates.map((mandate) => this.serializeMandate(mandate));
        }

        if (options.includeComments && proposition.comments) {
            exported.comments = proposition.comments.map((comment) => this.serializeComment(comment));
        }

        if (options.includeEvents && proposition.events) {
            exported.events = proposition.events.map((event) => this.serializeEvent(event));
        }

        if (options.includeReactions && proposition.reactions) {
            exported.reactions = proposition.reactions.map((reaction) => this.serializeReaction(reaction));
        }

        return exported;
    }

    /**
     * Sérialise une référence utilisateur
     */
    private serializeUserReference(user: User): ExportedUserReference {
        return {
            sourceId: user.id,
            username: user.username,
            email: user.email,
            displayName: user.username,
            role: user.role,
        };
    }

    /**
     * Sérialise une référence catégorie
     */
    private serializeCategoryReference(category: any): ExportedCategoryReference {
        return {
            sourceId: category.id,
            name: category.name,
        };
    }

    /**
     * Sérialise une référence fichier avec son contenu
     */
    private async serializeFileReference(file: File): Promise<ExportedFileReference> {
        // Lire le fichier depuis le storage et l'encoder en base64
        const fileBuffer = await this.fileService.getFileBuffer(file);

        return {
            sourceId: file.id,
            name: file.name,
            extension: file.extension,
            mimeType: file.mimeType,
            size: file.size,
            data: fileBuffer.toString('base64'),
        };
    }

    /**
     * Sérialise une référence proposition associée
     */
    private serializePropositionReference(proposition: Proposition): ExportedPropositionReference {
        return {
            sourceId: proposition.id,
            title: proposition.title,
        };
    }

    /**
     * Sérialise l'historique de statut
     */
    private serializeStatusHistory(history: any): ExportedStatusHistory {
        return {
            fromStatus: history.fromStatus,
            toStatus: history.toStatus,
            triggeredBy: history.triggeredBy ? this.serializeUserReference(history.triggeredBy) : null,
            reason: history.reason,
            metadata: history.metadata,
            createdAt: history.createdAt.toISO(),
        };
    }

    /**
     * Sérialise un vote
     */
    private serializeVote(vote: any, includeBallots: boolean): ExportedVote {
        const exported: ExportedVote = {
            sourceId: vote.id,
            phase: vote.phase,
            method: vote.method,
            title: vote.title,
            description: vote.description,
            openAt: vote.openAt?.toISO() ?? null,
            closeAt: vote.closeAt?.toISO() ?? null,
            maxSelections: vote.maxSelections,
            status: vote.status,
            metadata: vote.metadata,
            options: vote.options?.map((option: any) => this.serializeVoteOption(option)) ?? [],
        };

        if (includeBallots && vote.ballots) {
            exported.ballots = vote.ballots.map((ballot: any) => this.serializeVoteBallot(ballot));
        }

        return exported;
    }

    /**
     * Sérialise une option de vote
     */
    private serializeVoteOption(option: any): ExportedVoteOption {
        return {
            sourceId: option.id,
            label: option.label,
            description: option.description,
            position: option.position,
            metadata: option.metadata,
        };
    }

    /**
     * Sérialise un bulletin de vote
     */
    private serializeVoteBallot(ballot: any): ExportedVoteBallot {
        return {
            voter: this.serializeUserReference(ballot.voter),
            payload: ballot.payload,
            recordedAt: ballot.recordedAt.toISO(),
            revokedAt: ballot.revokedAt?.toISO() ?? null,
        };
    }

    /**
     * Sérialise un mandat
     */
    private serializeMandate(mandate: any): ExportedMandate {
        return {
            sourceId: mandate.id,
            title: mandate.title,
            description: mandate.description,
            holder: mandate.holder ? this.serializeUserReference(mandate.holder) : null,
            status: mandate.status,
            targetObjectiveRef: mandate.targetObjectiveRef,
            initialDeadline: mandate.initialDeadline?.toISO() ?? null,
            currentDeadline: mandate.currentDeadline?.toISO() ?? null,
            metadata: mandate.metadata,
        };
    }

    /**
     * Sérialise un commentaire
     */
    private serializeComment(comment: any): ExportedComment {
        return {
            sourceId: comment.id,
            parentSourceId: comment.parentId,
            author: this.serializeUserReference(comment.author),
            scope: comment.scope,
            section: comment.section,
            visibility: comment.visibility,
            content: comment.content,
            createdAt: comment.createdAt.toISO(),
        };
    }

    /**
     * Sérialise un événement
     */
    private serializeEvent(event: any): ExportedEvent {
        return {
            sourceId: event.id,
            type: event.type,
            title: event.title,
            description: event.description,
            startAt: event.startAt?.toISO() ?? null,
            endAt: event.endAt?.toISO() ?? null,
            location: event.location,
            videoLink: event.videoLink,
            createdBy: event.createdBy ? this.serializeUserReference(event.createdBy) : null,
            createdAt: event.createdAt.toISO(),
        };
    }

    /**
     * Sérialise une réaction
     */
    private serializeReaction(reaction: any): ExportedReaction {
        return {
            author: this.serializeUserReference(reaction.author),
            type: reaction.type,
            createdAt: reaction.createdAt.toISO(),
        };
    }
}
