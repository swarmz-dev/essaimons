import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import Proposition from '#models/proposition';
import PropositionExportService from '#services/proposition_export_service';
import PropositionImportAnalyzerService from '#services/proposition_import_analyzer_service';
import PropositionImportExecutorService from '#services/proposition_import_executor_service';
import { exportPropositionsValidator, importUploadValidator, importConfigurationValidator } from '#validators/proposition_import_validator';
import type { ExportData } from '#types/import_export_types';
import { readFile } from 'node:fs/promises';

@inject()
export default class AdminPropositionImportExportController {
    constructor(
        private readonly exportService: PropositionExportService,
        private readonly analyzerService: PropositionImportAnalyzerService,
        private readonly executorService: PropositionImportExecutorService
    ) {}

    /**
     * POST /api/admin/propositions/export
     * Export propositions as JSON
     */
    public async export({ request, response, auth, i18n }: HttpContext) {
        const user = auth.getUserOrFail();

        try {
            const payload = await request.validateUsing(exportPropositionsValidator);

            // Load propositions
            const propositions = await Proposition.query().whereIn('id', payload.propositionIds).exec();

            if (propositions.length === 0) {
                return response.notFound({
                    error: i18n.t('messages.admin.propositions.export.error.not-found'),
                });
            }

            if (propositions.length !== payload.propositionIds.length) {
                return response.badRequest({
                    error: i18n.t('messages.admin.propositions.export.error.some-not-found'),
                });
            }

            // Export
            const exportData: ExportData = await this.exportService.exportPropositions(propositions, user, payload.options || {});

            // Generate a filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `propositions-export-${timestamp}.json`;

            // Return the JSON
            return response
                .header('Content-Type', 'application/json')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .send(JSON.stringify(exportData, null, 2));
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.propositions.export.error.default'),
                details: error.message,
            });
        }
    }

    /**
     * POST /api/admin/propositions/import/analyze
     * Analyze an import file and return conflicts
     */
    public async analyzeImport({ request, response, auth, i18n }: HttpContext) {
        const user = auth.getUserOrFail();

        try {
            const payload = await request.validateUsing(importUploadValidator);
            const uploadedFile = payload.file;

            // Read JSON file content
            if (!uploadedFile.tmpPath) {
                return response.badRequest({
                    error: i18n.t('messages.admin.propositions.import.error.invalid-json'),
                });
            }

            const fileContent = await readFile(uploadedFile.tmpPath, 'utf-8');
            let exportData: ExportData;

            try {
                exportData = JSON.parse(fileContent);
            } catch (parseError) {
                return response.badRequest({
                    error: i18n.t('messages.admin.propositions.import.error.invalid-json'),
                });
            }

            // Analyze the import
            const conflictReport = await this.analyzerService.analyzeImport(exportData, user.id, i18n);

            // Return the report
            return response.ok(conflictReport);
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.propositions.import.error.analyze-failed'),
                details: error.message,
            });
        }
    }

    /**
     * POST /api/admin/propositions/import/configure
     * Save conflict resolution configuration
     */
    public async configureImport({ request, response, i18n }: HttpContext) {
        try {
            const configuration = await request.validateUsing(importConfigurationValidator);

            // Verify that the session exists
            const session = this.analyzerService.getImportSession(configuration.importId);

            if (!session) {
                return response.notFound({
                    error: i18n.t('messages.admin.propositions.import.error.session-not-found'),
                });
            }

            // Update the configuration
            this.analyzerService.updateSessionConfiguration(configuration.importId, configuration);

            return response.ok({
                message: i18n.t('messages.admin.propositions.import.configure.success'),
                importId: configuration.importId,
            });
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.propositions.import.error.configure-failed'),
                details: error.message,
            });
        }
    }

    /**
     * POST /api/admin/propositions/import/execute
     * Execute import with the provided configuration
     */
    public async executeImport({ request, response, auth, i18n }: HttpContext) {
        const user = auth.getUserOrFail();

        try {
            const configuration = await request.validateUsing(importConfigurationValidator);

            // Verify that the session exists
            const session = this.analyzerService.getImportSession(configuration.importId);

            if (!session) {
                return response.notFound({
                    error: i18n.t('messages.admin.propositions.import.error.session-not-found'),
                });
            }

            // Execute the import
            const result = await this.executorService.executeImport(configuration as any, user);

            if (result.success) {
                return response.ok({
                    message: i18n.t('messages.admin.propositions.import.execute.success'),
                    result,
                });
            } else {
                return response.badRequest({
                    error: i18n.t('messages.admin.propositions.import.execute.error.failed'),
                    result,
                });
            }
        } catch (error: any) {
            return response.internalServerError({
                error: i18n.t('messages.admin.propositions.import.error.execute-failed'),
                details: error.message,
            });
        }
    }

    /**
     * GET /api/admin/propositions/import/:importId/session
     * Get an import session
     */
    public async getSession({ request, response, i18n }: HttpContext) {
        try {
            const importId = request.param('importId');

            const session = this.analyzerService.getImportSession(importId);

            if (!session) {
                return response.notFound({
                    error: i18n.t('messages.admin.propositions.import.error.session-not-found'),
                });
            }

            // Don't return complete export data (too large)
            return response.ok({
                id: session.id,
                conflictReport: session.conflictReport,
                configuration: session.configuration,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
            });
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.propositions.import.error.session-failed'),
                details: error.message,
            });
        }
    }
}
