import vine from '@vinejs/vine';
import { ContentReportReasonEnum, ContentReportStatusEnum, ContentTypeEnum } from '#types';

/**
 * Validator for creating a content report
 */
export const createContentReportValidator = vine.compile(
    vine.object({
        contentType: vine.enum(ContentTypeEnum),
        contentId: vine.string().uuid(),
        reason: vine.enum(ContentReportReasonEnum),
        description: vine.string().trim().optional(),
    })
);

/**
 * Validator for reviewing a content report (admin only)
 */
export const reviewContentReportValidator = vine.compile(
    vine.object({
        status: vine.enum([ContentReportStatusEnum.REVIEWED, ContentReportStatusEnum.DISMISSED]),
        reviewNotes: vine.string().trim().optional(),
    })
);

/**
 * Validator for listing content reports with filters
 */
export const listContentReportsValidator = vine.compile(
    vine.object({
        page: vine.number().min(1).optional(),
        limit: vine.number().min(1).max(100).optional(),
        status: vine.enum(ContentReportStatusEnum).optional(),
        contentType: vine.enum(ContentTypeEnum).optional(),
    })
);
