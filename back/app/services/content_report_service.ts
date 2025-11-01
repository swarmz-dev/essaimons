import { inject } from '@adonisjs/core';
import { DateTime } from 'luxon';
import ContentReport from '#models/content_report';
import PropositionComment from '#models/proposition_comment';
import Proposition from '#models/proposition';
import User from '#models/user';
import { ContentReportReasonEnum, ContentReportStatusEnum, ContentTypeEnum, UserRoleEnum } from '#types';
import { ModelPaginatorContract } from '@adonisjs/lucid/types/model';
import logger from '@adonisjs/core/services/logger';

interface CreateReportPayload {
    contentType: ContentTypeEnum;
    contentId: string;
    reason: ContentReportReasonEnum;
    description?: string;
}

interface ReviewReportPayload {
    status: ContentReportStatusEnum.REVIEWED | ContentReportStatusEnum.DISMISSED;
    reviewNotes?: string;
}

interface ListReportsFilters {
    page?: number;
    limit?: number;
    status?: ContentReportStatusEnum;
    contentType?: ContentTypeEnum;
}

@inject()
export default class ContentReportService {
    /**
     * Create a new content report
     */
    public async create(reporter: User, payload: CreateReportPayload): Promise<ContentReport> {
        // Verify the content exists
        await this.verifyContentExists(payload.contentType, payload.contentId);

        // Check if user already reported this content
        const existingReport = await ContentReport.query()
            .where('reporter_user_id', reporter.id)
            .where('content_type', payload.contentType)
            .where('content_id', payload.contentId)
            .where('status', ContentReportStatusEnum.PENDING)
            .first();

        if (existingReport) {
            throw new Error('report.already-exists');
        }

        const report = await ContentReport.create({
            reporterUserId: reporter.id,
            contentType: payload.contentType,
            contentId: payload.contentId,
            reason: payload.reason,
            description: payload.description || null,
            status: ContentReportStatusEnum.PENDING,
        });

        await report.load('reporter', (query) => {
            query.select(['id', 'username', 'email']);
        });

        logger.info(
            {
                reportId: report.id,
                reporterUserId: reporter.id,
                contentType: payload.contentType,
                contentId: payload.contentId,
                reason: payload.reason,
            },
            'Content report created'
        );

        return report;
    }

    /**
     * Review a content report (admin only)
     */
    public async review(report: ContentReport, reviewer: User, payload: ReviewReportPayload): Promise<ContentReport> {
        if (reviewer.role !== UserRoleEnum.ADMIN) {
            throw new Error('forbidden');
        }

        if (report.status !== ContentReportStatusEnum.PENDING) {
            throw new Error('report.already-reviewed');
        }

        report.status = payload.status;
        report.reviewedByUserId = reviewer.id;
        report.reviewedAt = DateTime.now();
        report.reviewNotes = payload.reviewNotes || null;

        await report.save();
        await report.load('reviewer', (query) => {
            query.select(['id', 'username']);
        });

        logger.info(
            {
                reportId: report.id,
                reviewerId: reviewer.id,
                status: payload.status,
            },
            'Content report reviewed'
        );

        return report;
    }

    /**
     * List content reports with filters and pagination
     */
    public async list(filters: ListReportsFilters = {}): Promise<ModelPaginatorContract<ContentReport>> {
        logger.info('ContentReportService.list - START', { filters });

        const page = filters.page || 1;
        const limit = filters.limit || 20;

        logger.info('ContentReportService.list - Building query', { page, limit });

        let query = ContentReport.query()
            .preload('reporter', (query) => {
                query.select(['id', 'username', 'email']);
            })
            .preload('reviewer', (query) => {
                query.select(['id', 'username']);
            })
            .orderBy('created_at', 'desc');

        if (filters.status) {
            query = query.where('status', filters.status);
        }

        if (filters.contentType) {
            query = query.where('content_type', filters.contentType);
        }

        logger.info('ContentReportService.list - Executing query');
        const result = await query.paginate(page, limit);
        logger.info('ContentReportService.list - Query complete', { count: result.all().length });

        return result;
    }

    /**
     * Get a single report by ID with full details
     */
    public async getById(reportId: string): Promise<ContentReport> {
        const report = await ContentReport.query()
            .where('id', reportId)
            .preload('reporter', (query) => {
                query.select(['id', 'username', 'email', 'profile_picture_id']).preload('profilePicture');
            })
            .preload('reviewer', (query) => {
                query.select(['id', 'username']);
            })
            .firstOrFail();

        return report;
    }

    /**
     * Get pending reports count (for admin notifications)
     */
    public async getPendingCount(): Promise<number> {
        const result = await ContentReport.query().where('status', ContentReportStatusEnum.PENDING).count('* as total').first();

        return Number(result?.$extras.total || 0);
    }

    /**
     * Verify that the reported content exists
     */
    private async verifyContentExists(contentType: ContentTypeEnum, contentId: string): Promise<void> {
        if (contentType === ContentTypeEnum.COMMENT) {
            const comment = await PropositionComment.find(contentId);
            if (!comment) {
                throw new Error('content.not-found');
            }
        } else if (contentType === ContentTypeEnum.PROPOSITION) {
            const proposition = await Proposition.find(contentId);
            if (!proposition) {
                throw new Error('content.not-found');
            }
        }
    }

    /**
     * Get the actual content object for a report (for admin review UI)
     */
    public async getReportedContent(report: ContentReport): Promise<PropositionComment | Proposition | null> {
        if (report.contentType === ContentTypeEnum.COMMENT) {
            return PropositionComment.query()
                .where('id', report.contentId)
                .preload('author', (query) => {
                    query.select(['id', 'username', 'profile_picture_id']).preload('profilePicture');
                })
                .preload('proposition', (query) => {
                    query.select(['id', 'title']);
                })
                .first();
        } else if (report.contentType === ContentTypeEnum.PROPOSITION) {
            return Proposition.query()
                .where('id', report.contentId)
                .preload('creator', (query) => {
                    query.select(['id', 'username', 'profile_picture_id']).preload('profilePicture');
                })
                .first();
        }

        return null;
    }
}
