import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import PropositionService from '#services/proposition_service';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionCategoryRepository from '#repositories/proposition_category_repository';
import UserRepository from '#repositories/user_repository';
import { createPropositionValidator } from '#validators/proposition';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import type { MultipartFileContract } from '@adonisjs/core/bodyparser';
import { errors } from '@vinejs/vine';
import type { SerializedPropositionBootstrap } from '#types/serialized/serialized_proposition_bootstrap';
import PropositionCategory from '#models/proposition_category';

@inject()
export default class PropositionController {
    constructor(
        private readonly propositionService: PropositionService,
        private readonly propositionRepository: PropositionRepository,
        private readonly propositionCategoryRepository: PropositionCategoryRepository,
        private readonly userRepository: UserRepository
    ) {}

    public async bootstrap({ response, user }: HttpContext): Promise<void> {
        const [categories, propositions, users, rawCategoryCount] = await Promise.all([
            this.propositionCategoryRepository.all(),
            this.propositionRepository.all(),
            this.userRepository.Model.query().if(user, (builder): void => {
                builder.whereNot('id', (user as User).id);
            }),
            PropositionCategory.query().count('* as total'),
        ]);

        logger.debug(`proposition.bootstrap counts => categories:${categories.length} raw:${JSON.stringify(rawCategoryCount)} propositions:${propositions.length} users:${users.length}`);

        const payload: SerializedPropositionBootstrap = {
            categories: categories.map((category) => category.apiSerialize()),
            propositions: propositions.map((proposition) => proposition.summarySerialize()),
            users: users.map((item) => item.summarySerialize()),
        };

        return response.ok(payload);
    }

    public async create(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const categoryIds: string[] = this.parseCsv(request.input('categoryIds'));
        const associatedPropositionIds: string[] = this.parseCsv(request.input('associatedPropositionIds'));
        const rescueInitiatorIds: number[] = this.parseNumberCsv(request.input('rescueInitiatorIds'));

        const visual: MultipartFileContract | null = request.file('visual', {
            size: '5mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp'],
        });

        const attachments: MultipartFileContract[] = request.files('attachments', {
            size: '15mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'odt', 'ods'],
        });

        if (visual?.hasErrors) {
            return response.badRequest({ errors: visual.errors });
        }

        const attachmentsErrors = attachments.filter((file) => file.hasErrors);
        if (attachmentsErrors.length) {
            return response.badRequest({ errors: attachmentsErrors.flatMap((file) => file.errors ?? []) });
        }

        try {
            const payload = await createPropositionValidator.validate({
                title: request.input('title'),
                summary: request.input('summary'),
                detailedDescription: request.input('detailedDescription'),
                smartObjectives: request.input('smartObjectives'),
                impacts: request.input('impacts'),
                mandatesDescription: request.input('mandatesDescription'),
                expertise: request.input('expertise'),
                clarificationDeadline: request.input('clarificationDeadline'),
                improvementDeadline: request.input('improvementDeadline'),
                voteDeadline: request.input('voteDeadline'),
                mandateDeadline: request.input('mandateDeadline'),
                evaluationDeadline: request.input('evaluationDeadline'),
                categoryIds,
                associatedPropositionIds,
                rescueInitiatorIds,
            });

            const proposition: Proposition = await this.propositionService.create(payload, user as User, {
                visual,
                attachments,
            });

            logger.info('proposition.create.success', {
                id: proposition.id,
                title: proposition.title,
                creatorId: proposition.creatorId,
            });

            return response.created({
                message: i18n.t('messages.proposition.create.success', { title: proposition.title }),
                proposition: proposition.apiSerialize(),
            });
        } catch (error: any) {
            logger.error('proposition.create.error', {
                message: error?.message,
                stack: error?.stack,
            });
            if (error instanceof errors.E_VALIDATION_ERROR) {
                return response.badRequest({ errors: error.messages });
            }

            if (typeof error.message === 'string' && error.message.startsWith('messages.proposition.create.')) {
                return response.badRequest({ error: i18n.t(error.message) });
            }

            const fallbackMessage = i18n.t('messages.proposition.create.error.default');

            const errorDetails: string | undefined = typeof error?.message === 'string' ? error.message : undefined;

            return response.badRequest({
                error: fallbackMessage,
                ...(app.inProduction || !errorDetails ? {} : { details: errorDetails }),
            });
        }
    }

    private parseCsv(value: string | string[] | null | undefined): string[] {
        if (!value) {
            return [];
        }

        const toParts = (entry: unknown): string[] => {
            if (entry === null || entry === undefined) {
                return [];
            }
            return entry
                .toString()
                .split(',')
                .map((part: string) => part.trim())
                .filter((part) => part.length > 0);
        };

        const entries: string[] = Array.isArray(value) ? value.flatMap(toParts) : toParts(value);

        const seen = new Set<string>();

        return entries
            .filter((item) => !seen.has(item))
            .map((item) => {
                seen.add(item);
                return item;
            });
    }

    private parseNumberCsv(value: string | string[] | null | undefined): number[] {
        return this.parseCsv(value)
            .map((item) => Number(item))
            .filter((item) => !Number.isNaN(item));
    }
}
