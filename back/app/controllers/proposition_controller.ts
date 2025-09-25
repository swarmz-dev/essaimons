import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import PropositionService from '#services/proposition_service';
import PropositionRepository from '#repositories/proposition_repository';
import PropositionCategoryRepository from '#repositories/proposition_category_repository';
import UserRepository from '#repositories/user_repository';
import { createPropositionValidator, searchPropositionsValidator, updatePropositionValidator } from '#validators/proposition';
import type Proposition from '#models/proposition';
import type User from '#models/user';
import { errors } from '@vinejs/vine';
import PropositionCategory from '#models/proposition_category';
import { SerializedUserSummary } from '#types/serialized/serialized_user_summary';
import { SerializedPropositionSummary } from '#types/serialized/serialized_proposition_summary';
import { SerializedPropositionCategory } from '#types/serialized/serialized_proposition_category';
import type { PaginatedPropositions } from '#types/paginated/paginated_propositions';
import type { MultipartFile } from '#types/multipart_file';
import { UserRoleEnum } from '#types/enum/user_role_enum';

@inject()
export default class PropositionController {
    constructor(
        private readonly propositionService: PropositionService,
        private readonly propositionRepository: PropositionRepository,
        private readonly propositionCategoryRepository: PropositionCategoryRepository,
        private readonly userRepository: UserRepository
    ) {}

    public async search({ request, response }: HttpContext): Promise<void> {
        const rawCategoryIds: string[] = this.parseCsv(request.input('categories'));

        const { query, page, limit, categoryIds } = await searchPropositionsValidator.validate({
            query: request.input('query'),
            page: request.input('page'),
            limit: request.input('limit'),
            categoryIds: rawCategoryIds,
        });

        const paginated: PaginatedPropositions = await this.propositionRepository.searchWithFilters(
            {
                search: query && query.length ? query : undefined,
                categoryIds: categoryIds?.length ? categoryIds : undefined,
            },
            page || 1,
            limit || 12
        );

        const categories: PropositionCategory[] = await this.propositionCategoryRepository.all();

        return response.ok({
            ...paginated,
            filters: {
                categories: categories.map((category: PropositionCategory): SerializedPropositionCategory => category.apiSerialize()),
            },
        });
    }

    public async bootstrap({ response, user }: HttpContext): Promise<void> {
        const [categories, propositions, users, rawCategoryCount] = await Promise.all([
            this.propositionCategoryRepository.all(),
            this.propositionRepository.all(),
            this.userRepository.getAllOtherUsers(user),
            PropositionCategory.query().count('* as total'),
        ]);

        logger.debug(`proposition.bootstrap counts => categories:${categories.length} raw:${JSON.stringify(rawCategoryCount)} propositions:${propositions.length} users:${users.length}`);

        return response.ok({
            categories: categories.map((category: PropositionCategory): SerializedPropositionCategory => category.apiSerialize()),
            propositions: propositions.map((proposition: Proposition): SerializedPropositionSummary => proposition.summarySerialize()),
            users: users.map((item: User): SerializedUserSummary => item.summarySerialize()),
        });
    }

    public async create(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const categoryIds: string[] = this.parseCsv(request.input('categoryIds'));
        const associatedPropositionIds: string[] = this.parseCsv(request.input('associatedPropositionIds'));
        const rescueInitiatorIds: string[] = this.parseCsv(request.input('rescueInitiatorIds'));

        const visual: MultipartFile | null = request.file('visual', {
            size: '5mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp'],
        }) as MultipartFile | null;

        const rawAttachments = request.files('attachments', {
            size: '15mb',
            extnames: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'odt', 'ods'],
        });

        const attachments: MultipartFile[] = (rawAttachments as unknown as any[]).map((file) => ({
            clientName: file.clientName,
            tmpPath: file.tmpPath,
            extname: file.extname,
            size: file.size,
            type: file.type,
            subtype: file.subtype,
            isValid: file.isValid,
            hasErrors: file.hasErrors,
            errors:
                file.errors?.map((e: any) => ({
                    field: e.field,
                    rule: e.rule,
                    message: e.message,
                })) ?? [],
            move: file.move.bind(file),
            delete: file.delete?.bind(file),
        }));

        if (visual?.hasErrors) {
            return response.badRequest({ errors: visual.errors });
        }

        const attachmentsErrors: MultipartFile[] = attachments.filter((file: MultipartFile): boolean => file.hasErrors);
        if (attachmentsErrors.length) {
            return response.badRequest({ errors: attachmentsErrors.flatMap((file: MultipartFile) => file.errors ?? []) });
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

    public async show({ request, response, i18n }: HttpContext): Promise<void> {
        const publicIdParam = request.param('id');

        if (!publicIdParam || typeof publicIdParam !== 'string' || publicIdParam.trim().length === 0) {
            return response.badRequest({ error: i18n.t('messages.proposition.show.invalid-id') });
        }

        const proposition: Proposition | null = await this.propositionRepository.findByPublicId(publicIdParam.trim(), [
            'categories',
            'rescueInitiators',
            'associatedPropositions',
            'attachments',
            'creator',
            'visual',
        ]);

        if (!proposition) {
            return response.notFound({ error: i18n.t('messages.proposition.show.not-found') });
        }

        return response.ok({ proposition: proposition.apiSerialize() });
    }

    public async update(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const identifierParam = request.param('id');

        if (!identifierParam || typeof identifierParam !== 'string' || identifierParam.trim().length === 0) {
            return response.badRequest({ error: i18n.t('messages.proposition.show.invalid-id') });
        }

        const proposition: Proposition | null = await this.propositionRepository.findByPublicId(identifierParam.trim(), [
            'categories',
            'rescueInitiators',
            'associatedPropositions',
            'attachments',
            'creator',
            'visual',
        ]);

        if (!proposition) {
            return response.notFound({ error: i18n.t('messages.proposition.show.not-found') });
        }

        const actor: User = user as User;
        const isAdmin: boolean = actor?.role === UserRoleEnum.ADMIN;
        const isCreator: boolean = proposition.creatorId === actor?.id;
        const isRescueInitiator: boolean = (proposition.rescueInitiators ?? []).some((rescueUser: User) => rescueUser.id === actor?.id);

        if (!isAdmin && !isCreator && !isRescueInitiator) {
            return response.forbidden({ error: i18n.t('messages.proposition.update.forbidden') });
        }

        const categoryIds: string[] = this.parseCsv(request.input('categoryIds'));
        const associatedPropositionIds: string[] = this.parseCsv(request.input('associatedPropositionIds'));
        const rescueInitiatorIds: string[] = this.parseCsv(request.input('rescueInitiatorIds'));

        try {
            const payload = await updatePropositionValidator.validate({
                title: request.input('title'),
                summary: request.input('summary'),
                detailedDescription: request.input('detailedDescription'),
                smartObjectives: request.input('smartObjectives'),
                impacts: request.input('impacts'),
                mandatesDescription: request.input('mandatesDescription'),
                expertise: request.input('expertise'),
                categoryIds,
                associatedPropositionIds,
                rescueInitiatorIds,
                clarificationDeadline: request.input('clarificationDeadline'),
                improvementDeadline: request.input('improvementDeadline'),
                voteDeadline: request.input('voteDeadline'),
                mandateDeadline: request.input('mandateDeadline'),
                evaluationDeadline: request.input('evaluationDeadline'),
            });

            const updatedProposition: Proposition = await this.propositionService.update(proposition, payload, actor);

            logger.info('proposition.update.success', {
                id: updatedProposition.id,
                title: updatedProposition.title,
                actorId: actor?.id,
            });

            return response.ok({
                message: i18n.t('messages.proposition.update.success', { title: updatedProposition.title }),
                proposition: updatedProposition.apiSerialize(),
            });
        } catch (error: any) {
            logger.error('proposition.update.error', {
                message: error?.message,
                stack: error?.stack,
            });

            if (error instanceof errors.E_VALIDATION_ERROR) {
                return response.badRequest({ errors: error.messages });
            }

            if (typeof error?.message === 'string' && error.message.startsWith('messages.proposition.create.')) {
                return response.badRequest({ error: i18n.t(error.message) });
            }

            const fallbackMessage = i18n.t('messages.proposition.update.error.default');
            const errorDetails: string | undefined = typeof error?.message === 'string' ? error.message : undefined;

            return response.badRequest({
                error: fallbackMessage,
                ...(app.inProduction || !errorDetails ? {} : { details: errorDetails }),
            });
        }
    }

    public async delete(ctx: HttpContext): Promise<void> {
        const { request, response, i18n, user } = ctx;

        const identifierParam = request.param('id');

        if (!identifierParam || typeof identifierParam !== 'string' || identifierParam.trim().length === 0) {
            return response.badRequest({ error: i18n.t('messages.proposition.show.invalid-id') });
        }

        const proposition: Proposition | null = await this.propositionRepository.findByPublicId(identifierParam.trim(), ['rescueInitiators']);

        if (!proposition) {
            return response.notFound({ error: i18n.t('messages.proposition.show.not-found') });
        }

        const actor: User = user as User;
        const isAdmin: boolean = actor?.role === UserRoleEnum.ADMIN;
        const isCreator: boolean = proposition.creatorId === actor?.id;
        const isRescueInitiator: boolean = (proposition.rescueInitiators ?? []).some((rescueUser: User) => rescueUser.id === actor?.id);

        if (!isAdmin && !isCreator && !isRescueInitiator) {
            return response.forbidden({ error: i18n.t('messages.proposition.update.forbidden') });
        }

        try {
            await this.propositionService.delete(proposition);

            return response.ok({
                message: i18n.t('messages.proposition.delete.success', { title: proposition.title }),
            });
        } catch (error: any) {
            logger.error('proposition.delete.error', {
                message: error?.message,
                stack: error?.stack,
            });

            const fallbackMessage = i18n.t('messages.proposition.delete.error.default');
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
}
