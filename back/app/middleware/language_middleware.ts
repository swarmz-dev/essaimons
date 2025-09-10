import { HttpContext, Request } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import RequestLanguagesEnum from '#types/enum/request_languages_enum';
import LanguageRepository from '#repositories/language_repository';
import type { NextFn } from '@adonisjs/core/types/http';
import i18nManager from '@adonisjs/i18n/services/main';
import Language from '#models/language';
import env from '#start/env';

@inject()
export default class LanguageMiddleware {
    constructor(private readonly languageRepository: LanguageRepository) {}

    public async handle(ctx: HttpContext, next: NextFn): Promise<void> {
        const language: Language = await this.languageRepository.firstOrFail({
            code: this.getLanguageCode(ctx.request).toLowerCase(),
        });

        ctx.language = language;
        ctx.i18n = i18nManager.locale(language.code);

        if (env.get('NODE_ENV') === 'development') {
            await i18nManager.reloadTranslations();
        }

        await next();
    }

    private getLanguageCode(request: Request): RequestLanguagesEnum {
        try {
            return <RequestLanguagesEnum>(
                Object.keys(RequestLanguagesEnum).find((key: string): boolean => key === (request.headers()['accept-language']?.split(',')[0]?.split('-')[0] ?? RequestLanguagesEnum.EN).toUpperCase())
            );
        } catch (e) {
            return RequestLanguagesEnum.EN;
        }
    }
}
