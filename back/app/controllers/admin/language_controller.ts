import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import LanguageRepository from '#repositories/language_repository';
import { searchAdminLanguagesValidator, deleteLanguagesValidator, createLanguageValidator, getAdminLanguageValidator, updateLanguageValidator } from '#validators/admin/language';
import Language from '#models/language';
import cache from '@adonisjs/cache/services/main';
import app from '@adonisjs/core/services/app';
import File from '#models/file';
import path from 'node:path';
import FileTypeEnum from '#types/enum/file_type_enum';
import FileService from '#services/file_service';
import { MultipartFile } from '@adonisjs/bodyparser/types';
import PaginatedLanguages from '#types/paginated/paginated_languages';
import SerializedLanguage from '#types/serialized/serialized_language';

@inject()
export default class AdminLanguageController {
    constructor(
        private readonly languageRepository: LanguageRepository,
        private readonly fileService: FileService
    ) {}

    public async getAll({ request, response }: HttpContext) {
        const { query, page, limit, sortBy: inputSortBy } = await request.validateUsing(searchAdminLanguagesValidator);

        return response.ok(
            await cache.getOrSet({
                key: `admin-languages:query:${query}:page:${page}:limit:${limit}:sortBy:${inputSortBy}`,
                tags: [`admin-languages`],
                ttl: '1h',
                factory: async (): Promise<PaginatedLanguages> => {
                    const [field, order] = inputSortBy.split(':');
                    const sortBy = { field: field as keyof Language['$attributes'], order: order as 'asc' | 'desc' };

                    return await this.languageRepository.getAdminLanguages(query, page, limit, sortBy);
                },
            })
        );
    }

    public async delete({ request, response, i18n }: HttpContext) {
        const { languages } = await request.validateUsing(deleteLanguagesValidator);

        const statuses: { isDeleted: boolean; isFallback?: boolean; name?: string; code: string }[] = await this.languageRepository.delete(languages);

        return response.ok({
            messages: await Promise.all(
                statuses.map(async (status: { isDeleted: boolean; isFallback?: boolean; name?: string; code: string }): Promise<{ id: string; message: string; isSuccess: boolean }> => {
                    if (status.isDeleted) {
                        await cache.deleteByTag({ tags: [`admin-languages`, `admin-language:${status.code}`] });
                        return { id: status.code, message: i18n.t(`messages.admin.language.delete.success`, { name: status.name }), isSuccess: true };
                    } else {
                        if (status.isFallback) {
                            return { id: status.code, message: i18n.t(`messages.admin.language.delete.error.fallback`, { name: status.name }), isSuccess: false };
                        } else {
                            return { id: status.code, message: i18n.t(`messages.admin.language.delete.error.default`, { code: status.code }), isSuccess: false };
                        }
                    }
                })
            ),
        });
    }

    public async create({ request, response, i18n }: HttpContext) {
        const { name, code, flag: inputFlag } = await request.validateUsing(createLanguageValidator);

        let language: Language | null = await this.languageRepository.findOneBy({ code });
        if (language) {
            return response.badRequest({ error: i18n.t('messages.admin.language.create.error.already-exists', { code }) });
        }

        const flag: File = await this.processInputFlag(inputFlag, code);

        language = await Language.create({
            name,
            code,
            flagId: flag.id,
        });

        await Promise.all([language.load('flag'), cache.deleteByTag({ tags: ['admin-languages'] })]);

        return response.created({ language: language.apiSerialize(), message: i18n.t('messages.admin.language.create.success', { name }) });
    }

    public async update({ request, response, i18n }: HttpContext) {
        const { name, code, flag: inputFlag } = await request.validateUsing(updateLanguageValidator);

        const language: Language = await this.languageRepository.firstOrFail({ code });

        language.name = name;

        if (!this.areSameFiles(language.flag, inputFlag)) {
            this.fileService.delete(language.flag);
            const flag: File = await this.processInputFlag(inputFlag, code);
            language.flagId = flag.id;
        }

        await language.save();

        if (!this.areSameFiles(language.flag, inputFlag)) {
            await language.flag.delete();
        }

        await Promise.all([language.load('flag'), cache.deleteByTag({ tags: [`admin-languages`, `admin-language:${language.id}`] })]);

        return response.ok({ language: language.apiSerialize(), message: i18n.t('messages.admin.language.update.success', { name }) });
    }

    public async get({ request, response }: HttpContext) {
        const { languageCode: code } = await getAdminLanguageValidator.validate(request.params());
        const language: Language = await this.languageRepository.firstOrFail({ code });

        return response.ok(
            await cache.getOrSet({
                key: `admin-language:${language.id}`,
                tags: [`admin-language:${language.id}`],
                ttl: '1h',
                factory: (): SerializedLanguage => {
                    return language.apiSerialize();
                },
            })
        );
    }

    private async processInputFlag(inputFlag: MultipartFile, code: string): Promise<File> {
        const extension: string = path.extname(inputFlag.clientName);
        inputFlag.clientName = `${code}${extension}`;
        const flagPath: string = `static/language-flag`;
        await inputFlag.move(app.makePath(flagPath));
        const flag: File = await File.create({
            name: inputFlag.clientName,
            path: `${flagPath}/${inputFlag.clientName}`,
            extension,
            mimeType: `${inputFlag.type}/${inputFlag.subtype}`,
            size: inputFlag.size,
            type: FileTypeEnum.PROFILE_PICTURE,
        });

        return await flag.refresh();
    }

    private areSameFiles(file: File, multipartFile: MultipartFile): boolean {
        return (
            file.extension === path.extname(multipartFile.clientName) &&
            file.mimeType === `${multipartFile.type}/${multipartFile.subtype}` &&
            file.size === multipartFile.size &&
            file.type === multipartFile.type
        );
    }
}
