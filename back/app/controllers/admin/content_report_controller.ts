import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import ContentReportService from '#services/content_report_service';
import { listContentReportsValidator, reviewContentReportValidator } from '#validators/content_report';

@inject()
export default class AdminContentReportController {
    constructor(private readonly contentReportService: ContentReportService) {}

    /**
     * List all content reports with filters
     * GET /api/admin/reports
     */
    public async index({ request, response, logger }: HttpContext) {
        logger.info('Admin reports index - START', { query: request.qs() });

        const filters = await request.validateUsing(listContentReportsValidator);
        logger.info('Admin reports index - Filters validated', { filters });

        const paginatedReports = await this.contentReportService.list(filters);
        logger.info('Admin reports index - Data fetched', { count: paginatedReports.all().length });

        const serialized = paginatedReports.all().map((report) => report.serialize());
        logger.info('Admin reports index - COMPLETE');

        return response.ok({
            data: serialized,
            meta: paginatedReports.getMeta(),
        });
    }

    /**
     * Get a single report with full details including the reported content
     * GET /api/admin/reports/:id
     */
    public async show({ params, response }: HttpContext) {
        try {
            const report = await this.contentReportService.getById(params.id);
            const content = await this.contentReportService.getReportedContent(report);

            return response.ok({
                report,
                content,
            });
        } catch (error) {
            return response.notFound({
                error: 'Report not found',
            });
        }
    }

    /**
     * Review a content report
     * PUT /api/admin/reports/:id/review
     */
    public async review({ params, request, response, user, i18n }: HttpContext) {
        const payload = await request.validateUsing(reviewContentReportValidator);

        try {
            const report = await this.contentReportService.getById(params.id);
            const updatedReport = await this.contentReportService.review(report, user!, payload);

            return response.ok({
                report: updatedReport,
                message: i18n.t('messages.reports.review.success'),
            });
        } catch (error) {
            if ((error as Error).message === 'forbidden') {
                return response.forbidden({
                    error: i18n.t('messages.reports.review.error.forbidden'),
                });
            }

            if ((error as Error).message === 'report.already-reviewed') {
                return response.badRequest({
                    error: i18n.t('messages.reports.review.error.already-reviewed'),
                });
            }

            return response.notFound({
                error: i18n.t('messages.reports.review.error.not-found'),
            });
        }
    }

    /**
     * Get pending reports count
     * GET /api/admin/reports/pending/count
     */
    public async pendingCount({ response }: HttpContext) {
        const count = await this.contentReportService.getPendingCount();

        return response.ok({ count });
    }
}
