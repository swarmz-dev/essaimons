import app from '@adonisjs/core/services/app';
import { defineConfig, formatters, loaders } from '@adonisjs/i18n';
import Language from '#models/language';

const i18nConfig = defineConfig({
    defaultLocale: Language.LANGUAGE_ENGLISH.code,
    supportedLocales: [Language.LANGUAGE_ENGLISH.code, Language.LANGUAGE_FRENCH.code],
    formatter: formatters.icu(),
    loaders: [
        loaders.fs({
            location: app.languageFilesPath(),
        }),
    ],
});

export default i18nConfig;
