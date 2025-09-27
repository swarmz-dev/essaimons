import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import db from '@adonisjs/lucid/services/db';
import PropositionCategory from '#models/proposition_category';
import PropositionCategoryRepository from '#repositories/proposition_category_repository';
import { createAdminCategoryValidator, updateAdminCategoryValidator, deleteAdminCategoryValidator } from '#validators/admin/proposition_category';

@inject()
export default class AdminPropositionCategoryController {
    constructor(private readonly propositionCategoryRepository: PropositionCategoryRepository) {}

    public async index({ response }: HttpContext) {
        const categories: PropositionCategory[] = await this.propositionCategoryRepository.listAll('name');

        return response.ok({
            categories: categories.map((category) => category.apiSerialize()),
        });
    }

    public async create({ request, response, i18n }: HttpContext) {
        const { name } = await request.validateUsing(createAdminCategoryValidator);
        const normalizedName: string = name.trim();

        const existing: PropositionCategory | null = await this.propositionCategoryRepository.findOneBy({
            name: normalizedName,
        });
        if (existing) {
            return response.conflict({ error: i18n.t('messages.admin.categories.create.error.exists', { name: normalizedName }) });
        }

        try {
            const category: PropositionCategory = await PropositionCategory.create({ name: normalizedName });
            await category.refresh();

            return response.created({
                category: category.apiSerialize(),
                message: i18n.t('messages.admin.categories.create.success', { name: normalizedName }),
            });
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.categories.create.error.default'),
            });
        }
    }

    public async update({ request, response, i18n }: HttpContext) {
        const payload = await updateAdminCategoryValidator.validate({
            id: request.param('id'),
            name: request.input('name'),
        });

        const category: PropositionCategory | null = await this.propositionCategoryRepository.findByPublicId(payload.id);
        if (!category) {
            return response.notFound({ error: i18n.t('messages.admin.categories.update.error.not-found') });
        }

        const normalizedName: string = payload.name.trim();
        const duplicate: PropositionCategory | null = await this.propositionCategoryRepository.findOneBy({ name: normalizedName });
        if (duplicate && duplicate.id !== category.id) {
            return response.conflict({ error: i18n.t('messages.admin.categories.update.error.exists', { name: normalizedName }) });
        }

        category.name = normalizedName;

        try {
            await category.save();
            await category.refresh();

            return response.ok({
                category: category.apiSerialize(),
                message: i18n.t('messages.admin.categories.update.success', { name: normalizedName }),
            });
        } catch (error: any) {
            return response.badRequest({
                error: i18n.t('messages.admin.categories.update.error.default'),
            });
        }
    }

    public async delete({ request, response, i18n }: HttpContext) {
        const { id } = await deleteAdminCategoryValidator.validate({ id: request.param('id') ?? request.input('id') });

        const category: PropositionCategory | null = await this.propositionCategoryRepository.findByPublicId(id);
        if (!category) {
            return response.notFound({ error: i18n.t('messages.admin.categories.delete.error.not-found') });
        }

        const usageRow = await db.from('proposition_category_pivot').where('category_id', category.id).count('* as total').first();
        const totalUsage: number = Number(usageRow?.total ?? 0);
        if (totalUsage > 0) {
            return response.badRequest({
                error: i18n.t('messages.admin.categories.delete.error.in-use', { name: category.name, count: totalUsage }),
            });
        }

        try {
            await category.delete();
            return response.ok({ message: i18n.t('messages.admin.categories.delete.success', { name: category.name }) });
        } catch (error: any) {
            return response.badRequest({ error: i18n.t('messages.admin.categories.delete.error.default') });
        }
    }
}
