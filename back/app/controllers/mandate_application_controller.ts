import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import logger from '@adonisjs/core/services/logger';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionMandate from '#models/proposition_mandate';
import MandateApplication from '#models/mandate_application';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { serializeMandate, serializeMandateApplication } from '#serializers/mandate_serializer';
import { MandateApplicationStatusEnum, MandateStatusEnum } from '#types';
import PropositionWorkflowService from '#services/proposition_workflow_service';
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';

@inject()
export default class MandateApplicationController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly workflowService: PropositionWorkflowService
    ) {}

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        try {
            const description = request.input('description');
            if (!description || typeof description !== 'string' || !description.trim()) {
                return response.badRequest({ error: 'Description is required' });
            }

            // Check if the user has already applied
            const existing = await MandateApplication.query()
                .where('mandate_id', mandate.id)
                .where('applicant_user_id', (user as User).id)
                .first();

            if (existing) {
                return response.badRequest({ error: 'You have already applied for this mandate' });
            }

            const application = await MandateApplication.create({
                mandateId: mandate.id,
                applicantUserId: (user as User).id,
                statement: description.trim(),
            });

            await application.load('applicant', (query) => {
                query.select(['id', 'username', 'profile_picture_id']);
            });
            await mandate.load('applications', (query) => {
                query.preload('applicant', (userQuery) => {
                    userQuery.select(['id', 'username', 'profile_picture_id']);
                });
            });

            return response.created({
                application: serializeMandateApplication(application),
                mandate: serializeMandate(mandate),
            });
        } catch (error) {
            logger.error('mandate.application.create.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to create application' });
        }
    }

    public async accept(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        try {
            // Check permissions
            const canManage = await this.workflowService.canPerform(proposition, user as User, 'manage_mandates');
            if (!canManage) {
                return response.forbidden({ error: 'You are not allowed to manage mandate applications' });
            }

            // Validate mandate status
            if (mandate.status !== MandateStatusEnum.TO_ASSIGN) {
                return response.badRequest({ error: 'This mandate is not open for applications' });
            }

            // Find the application
            const applicationId = request.param('applicationId');
            const application = await MandateApplication.query().where('id', applicationId).where('mandate_id', mandate.id).first();

            if (!application) {
                return response.notFound({ error: 'Application not found' });
            }

            if (application.status !== MandateApplicationStatusEnum.PENDING) {
                return response.badRequest({ error: 'This application has already been processed' });
            }

            // Accept the application and assign the mandate
            application.status = MandateApplicationStatusEnum.ACCEPTED;
            await application.save();

            mandate.holderUserId = application.applicantUserId;
            mandate.status = MandateStatusEnum.ACTIVE;
            await mandate.save();

            // Reject all other pending applications for this mandate
            await MandateApplication.query()
                .where('mandate_id', mandate.id)
                .where('id', '!=', application.id)
                .where('status', MandateApplicationStatusEnum.PENDING)
                .update({ status: MandateApplicationStatusEnum.REJECTED });

            // Reload relations
            await application.load('applicant', (query) => {
                query.select(['id', 'username', 'profile_picture_id']);
            });
            await mandate.load('holder', (query: ModelQueryBuilderContract<typeof User>) => {
                query.select(['id', 'username', 'profile_picture_id']);
            });
            await mandate.load('applications', (query) => {
                query.preload('applicant', (userQuery) => {
                    userQuery.select(['id', 'username', 'profile_picture_id']);
                });
            });

            return response.ok({
                application: serializeMandateApplication(application),
                mandate: serializeMandate(mandate),
            });
        } catch (error) {
            logger.error('mandate.application.accept.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to accept application' });
        }
    }

    public async reject(ctx: HttpContext): Promise<void> {
        const { request, response, user } = ctx;
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        try {
            // Check permissions
            const canManage = await this.workflowService.canPerform(proposition, user as User, 'manage_mandates');
            if (!canManage) {
                return response.forbidden({ error: 'You are not allowed to manage mandate applications' });
            }

            // Validate mandate status
            if (mandate.status !== MandateStatusEnum.TO_ASSIGN) {
                return response.badRequest({ error: 'This mandate is not open for applications' });
            }

            // Find the application
            const applicationId = request.param('applicationId');
            const application = await MandateApplication.query().where('id', applicationId).where('mandate_id', mandate.id).first();

            if (!application) {
                return response.notFound({ error: 'Application not found' });
            }

            if (application.status !== MandateApplicationStatusEnum.PENDING) {
                return response.badRequest({ error: 'This application has already been processed' });
            }

            // Reject the application
            application.status = MandateApplicationStatusEnum.REJECTED;
            await application.save();

            // Reload relations
            await application.load('applicant', (query) => {
                query.select(['id', 'username', 'profile_picture_id']);
            });
            await mandate.load('applications', (query) => {
                query.preload('applicant', (userQuery) => {
                    userQuery.select(['id', 'username', 'profile_picture_id']);
                });
            });

            return response.ok({
                application: serializeMandateApplication(application),
                mandate: serializeMandate(mandate),
            });
        } catch (error) {
            logger.error('mandate.application.reject.error', { message: error?.message, stack: error?.stack });
            return response.badRequest({ error: error?.message ?? 'Unable to reject application' });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']): Promise<Proposition | null> {
        if (!param || typeof param !== 'string' || param.trim().length === 0) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }
        const proposition = await this.propositionRepository.findByPublicId(param.trim());
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }
        return proposition;
    }

    private async findMandate(proposition: Proposition, mandateId: string, response: HttpContext['response']): Promise<PropositionMandate | null> {
        if (!mandateId) {
            response.badRequest({ error: 'Invalid mandate id' });
            return null;
        }
        const mandate = await PropositionMandate.query().where('id', mandateId).where('propositionId', proposition.id).first();
        if (!mandate) {
            response.notFound({ error: 'Mandate not found' });
            return null;
        }
        return mandate;
    }
}
