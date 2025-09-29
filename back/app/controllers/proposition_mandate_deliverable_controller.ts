import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import PropositionRepository from '#repositories/proposition_repository';
import Proposition from '#models/proposition';
import PropositionMandate from '#models/proposition_mandate';
import MandateDeliverable from '#models/mandate_deliverable';
import type User from '#models/user';
import MandateDeliverableService from '#services/mandate_deliverable_service';
import { createMandateDeliverableValidator, evaluateMandateDeliverableValidator } from '#validators/mandate_deliverable';
import { serializeMandateDeliverable } from '#serializers/mandate_serializer';
import logger from '@adonisjs/core/services/logger';
import { errors } from '@vinejs/vine';

@inject()
export default class PropositionMandateDeliverableController {
    constructor(
        private readonly propositionRepository: PropositionRepository,
        private readonly deliverableService: MandateDeliverableService
    ) {}

    public async index({ request, response }: HttpContext): Promise<void> {
        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        await mandate.load((loader) => {
            loader
                .preload('deliverables', (deliverableQuery) => {
                    deliverableQuery
                        .orderBy('uploaded_at', 'asc')
                        .preload('file')
                        .preload('uploadedBy', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']))
                        .preload('evaluations', (evaluationQuery) => {
                            evaluationQuery.preload('evaluator', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']));
                        });
                })
                .preload('holder', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']))
                .preload('applications', (applicationQuery) => {
                    applicationQuery.preload('applicant', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']));
                })
                .preload('revocationRequests', (requestQuery) => {
                    requestQuery.preload('initiatedBy', (userQuery) => userQuery.select(['id', 'front_id', 'username', 'profile_picture_id']));
                });
        });

        const serialized = (mandate.deliverables ?? []).map((deliverable) => serializeMandateDeliverable(deliverable));
        return response.ok({ isSuccess: true, deliverables: serialized });
    }

    public async store(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        const file = request.file('file', {
            size: '50mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'odt', 'ods', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'],
        });

        if (!file) {
            return response.badRequest({ error: i18n.t('messages.deliverable.upload.file-required') });
        }

        try {
            const payload = await createMandateDeliverableValidator.validate({
                label: request.input('label'),
                objectiveRef: request.input('objectiveRef'),
            });

            const result = await this.deliverableService.upload(proposition, mandate, user as User, payload, file);

            return response.created({ isSuccess: true, ...result });
        } catch (error: any) {
            logger.error('deliverable.upload.error', {
                message: error?.message,
                stack: error?.stack,
            });

            if (error instanceof errors.E_VALIDATION_ERROR) {
                return response.badRequest({ errors: error.messages });
            }

            if (typeof error.message === 'string' && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: i18n.t('messages.deliverable.upload.forbidden') });
            }

            return response.badRequest({
                error: i18n.t('messages.deliverable.upload.failed'),
                details: error?.message,
            });
        }
    }

    public async evaluate(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const proposition = await this.findProposition(request.param('id'), response);
        if (!proposition) return;

        const mandate = await this.findMandate(proposition, request.param('mandateId'), response);
        if (!mandate) return;

        const deliverable = await this.findDeliverable(mandate, request.param('deliverableId'), response);
        if (!deliverable) return;

        try {
            const payload = await evaluateMandateDeliverableValidator.validate(request.only(['verdict', 'comment']));
            const result = await this.deliverableService.evaluate(proposition, mandate, deliverable, user as User, payload);
            return response.ok({ isSuccess: true, ...result });
        } catch (error: any) {
            logger.error('deliverable.evaluate.error', {
                message: error?.message,
                stack: error?.stack,
            });

            if (error instanceof errors.E_VALIDATION_ERROR) {
                return response.badRequest({ errors: error.messages });
            }

            if (typeof error.message === 'string' && error.message.startsWith('forbidden:')) {
                return response.forbidden({ error: i18n.t('messages.deliverable.evaluate.forbidden') });
            }

            return response.badRequest({
                error: i18n.t('messages.deliverable.evaluate.failed'),
                details: error?.message,
            });
        }
    }

    private async findProposition(param: string, response: HttpContext['response']) {
        if (!param || typeof param !== 'string' || !param.trim()) {
            response.badRequest({ error: 'Invalid proposition id' });
            return null;
        }

        const proposition = await this.propositionRepository.findByPublicId(param.trim(), ['mandates']);
        if (!proposition) {
            response.notFound({ error: 'Proposition not found' });
            return null;
        }

        return proposition;
    }

    private async findMandate(proposition: Proposition, mandateId: string, response: HttpContext['response']) {
        if (!mandateId || typeof mandateId !== 'string') {
            response.badRequest({ error: 'Invalid mandate id' });
            return null;
        }

        const mandate = await PropositionMandate.find(mandateId);
        if (!mandate || mandate.propositionId !== proposition.id) {
            response.notFound({ error: 'Mandate not found' });
            return null;
        }

        return mandate;
    }

    private async findDeliverable(mandate: PropositionMandate, deliverableId: string, response: HttpContext['response']) {
        if (!deliverableId || typeof deliverableId !== 'string') {
            response.badRequest({ error: 'Invalid deliverable id' });
            return null;
        }

        const deliverable = await MandateDeliverable.find(deliverableId);
        if (!deliverable || deliverable.mandateId !== mandate.id) {
            response.notFound({ error: 'Deliverable not found' });
            return null;
        }

        return deliverable;
    }
}
