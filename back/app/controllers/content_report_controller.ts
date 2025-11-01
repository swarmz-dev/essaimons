import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import ContentReportService from '#services/content_report_service';
import { createContentReportValidator } from '#validators/content_report';

@inject()
export default class ContentReportController {
    constructor(private readonly contentReportService: ContentReportService) {}

    /**
     * Create a new content report
     * POST /api/reports
     */
    public async create({ request, response, user, i18n }: HttpContext) {
        const payload = await request.validateUsing(createContentReportValidator);

        try {
            const report = await this.contentReportService.create(user!, payload);

            return response.created({
                report,
                message: i18n.t('messages.reports.create.success'),
            });
        } catch (error) {
            if ((error as Error).message === 'report.already-exists') {
                return response.badRequest({
                    error: i18n.t('messages.reports.create.error.already-exists'),
                });
            }

            if ((error as Error).message === 'content.not-found') {
                return response.notFound({
                    error: i18n.t('messages.reports.create.error.content-not-found'),
                });
            }

            throw error;
        }
    }
}
