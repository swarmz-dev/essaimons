import BaseRepository from '#repositories/base/base_repository';
import Language from '#models/language';
import SerializedLanguage from '#types/serialized/serialized_language';
import PaginatedLanguages from '#types/paginated/paginated_languages';
import { ModelPaginatorContract, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import FileService from '#services/file_service';
import { inject } from '@adonisjs/core';

@inject()
export default class LanguageRepository extends BaseRepository<typeof Language> {
    constructor(private readonly fileService: FileService) {
        super(Language);
    }

    public async getAdminLanguages(query: string, page: number, limit: number, sortBy: { field: keyof Language['$attributes']; order: 'asc' | 'desc' }): Promise<PaginatedLanguages> {
        const languages: ModelPaginatorContract<Language> = await this.Model.query()
            .if(query, (queryBuilder: ModelQueryBuilderContract<typeof Language>): void => {
                queryBuilder.where('name', 'ILIKE', `%${query}%`).orWhere('code', 'ILIKE', `%${query}%`);
            })
            .if(sortBy, (queryBuilder: ModelQueryBuilderContract<typeof Language>): void => {
                queryBuilder.orderBy(sortBy.field as string, sortBy.order);
            })
            .paginate(page, limit);

        return {
            languages: languages.all().map((language: Language): SerializedLanguage => language.apiSerialize()),
            firstPage: languages.firstPage,
            lastPage: languages.lastPage,
            limit,
            total: languages.total,
            currentPage: page,
        };
    }

    public async delete(codes: string[]): Promise<{ isDeleted: boolean; name?: string; code: string }[]> {
        // Delete some other things if needed
        return await Promise.all([
            ...codes.map(async (code: string): Promise<{ isDeleted: boolean; isFallback?: boolean; name?: string; code: string }> => {
                try {
                    const language: Language = await this.Model.query().where('code', code).firstOrFail();
                    if (language.isFallback) {
                        return { isDeleted: false, isFallback: true, name: language.name, code };
                    }
                    this.fileService.delete(language.flag);

                    await language.delete();
                    await language.flag.delete();

                    return { isDeleted: true, name: language.name, code };
                } catch (error: any) {
                    return { isDeleted: false, code };
                }
            }),
        ]);
    }
}
