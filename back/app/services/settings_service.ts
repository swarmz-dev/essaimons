import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import path from 'node:path';
import { cuid } from '@adonisjs/core/helpers';
import mime from 'mime-types';
import Language from '#models/language';
import SettingRepository from '#repositories/setting_repository';
import FileService from '#services/file_service';
import SlugifyService from '#services/slugify_service';
import File from '#models/file';
import Setting from '#models/setting';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import type { SerializedOrganizationSettings } from '#types/serialized/serialized_organization_settings';
import type { MultipartFile } from '@adonisjs/bodyparser/types';

const ORGANIZATION_SETTINGS_KEY = 'organization';

interface OrganizationSettingsValue {
    fallbackLocale: string;
    name: Record<string, string>;
    description: Record<string, string>;
    sourceCodeUrl: Record<string, string>;
    copyright: Record<string, string>;
    logoFileId: string | null;
}

interface UpdateOrganizationSettingsPayload {
    fallbackLocale: string;
    translations: {
        name: Record<string, string>;
        description: Record<string, string>;
        sourceCodeUrl: Record<string, string>;
        copyright: Record<string, string>;
    };
    removeLogo?: boolean;
}

@inject()
export default class SettingsService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly fileService: FileService,
        private readonly slugifyService: SlugifyService
    ) {}

    private normalizeTranslationMap(input: Record<string, unknown> | undefined | null): Record<string, string> {
        const result: Record<string, string> = {};
        if (!input) {
            return result;
        }
        for (const [locale, raw] of Object.entries(input)) {
            if (typeof raw !== 'string') continue;
            const trimmed = raw.trim();
            if (!trimmed.length) continue;
            const lower = locale.toLowerCase();
            result[lower] = trimmed;
        }
        return result;
    }

    private async serializeOrganizationSettings(value: OrganizationSettingsValue | null): Promise<SerializedOrganizationSettings> {
        const languages = await Language.query().orderBy('name', 'asc');
        const locales = languages.map((language) => ({
            code: language.code,
            label: language.name ?? language.code,
            isDefault: Boolean(language.isFallback),
        }));

        const storedFallback = value?.fallbackLocale?.toLowerCase();
        const fallbackLocale =
            storedFallback && locales.some((locale) => locale.code === storedFallback) ? storedFallback : (locales.find((locale) => locale.isDefault)?.code ?? locales[0]?.code ?? 'en');

        let logo: SerializedOrganizationSettings['logo'] = null;

        if (value?.logoFileId) {
            const file = await File.find(value.logoFileId);
            if (file) {
                logo = file.apiSerialize();
            }
        }

        return {
            fallbackLocale,
            locales,
            name: value?.name ?? {},
            description: value?.description ?? {},
            sourceCodeUrl: value?.sourceCodeUrl ?? {},
            copyright: value?.copyright ?? {},
            logo,
        };
    }

    public async getOrganizationSettings(): Promise<SerializedOrganizationSettings> {
        const record = await this.settingRepository.findByKey(ORGANIZATION_SETTINGS_KEY);
        const value = (record?.value as unknown as OrganizationSettingsValue | null | undefined) ?? null;
        return this.serializeOrganizationSettings(value);
    }

    public async updateOrganizationSettings(payload: UpdateOrganizationSettingsPayload, logoFile?: MultipartFile | null): Promise<SerializedOrganizationSettings> {
        const trx = await db.transaction();

        try {
            const languages = await Language.query({ client: trx }).orderBy('name', 'asc');
            const localeCodes = languages.map((language) => language.code.toLowerCase());

            let fallbackLocale = payload.fallbackLocale.toLowerCase();
            if (!localeCodes.includes(fallbackLocale)) {
                fallbackLocale = languages.find((language) => language.isFallback)?.code.toLowerCase() ?? localeCodes[0] ?? fallbackLocale;
            }

            let record = await this.settingRepository.findByKey(ORGANIZATION_SETTINGS_KEY, trx);
            let value: OrganizationSettingsValue = {
                fallbackLocale,
                name: {},
                description: {},
                sourceCodeUrl: {},
                copyright: {},
                logoFileId: null,
            };

            if (record) {
                const currentValue = (record.value as unknown as OrganizationSettingsValue) ?? null;
                if (currentValue) {
                    value = {
                        fallbackLocale: (currentValue.fallbackLocale ?? fallbackLocale).toLowerCase(),
                        name: currentValue.name ?? {},
                        description: currentValue.description ?? {},
                        sourceCodeUrl: currentValue.sourceCodeUrl ?? {},
                        copyright: currentValue.copyright ?? {},
                        logoFileId: currentValue.logoFileId ?? null,
                    };
                }
            } else {
                record = await Setting.create(
                    {
                        key: ORGANIZATION_SETTINGS_KEY,
                        value: value as unknown as Record<string, unknown>,
                    },
                    { client: trx }
                );
            }

            const allowedLocales = new Set(localeCodes.length ? localeCodes : Object.keys(payload.translations.name ?? {}).map((code) => code.toLowerCase()));

            const filterMap = (input: Record<string, string>): Record<string, string> => {
                const normalized = this.normalizeTranslationMap(input);
                const filtered: Record<string, string> = {};
                for (const [locale, value] of Object.entries(normalized)) {
                    const lower = locale.toLowerCase();
                    if (allowedLocales.has(lower)) {
                        filtered[lower] = value;
                    }
                }
                return filtered;
            };

            const filterUrlMap = (input: Record<string, string>): Record<string, string> => {
                const normalized = filterMap(input);
                const filtered: Record<string, string> = {};
                for (const [locale, url] of Object.entries(normalized)) {
                    try {
                        // eslint-disable-next-line no-new
                        new URL(url);
                        filtered[locale] = url;
                    } catch (error) {
                        // ignore invalid URLs
                    }
                }
                return filtered;
            };

            value.fallbackLocale = fallbackLocale;
            value.name = filterMap(payload.translations.name);
            value.description = filterMap(payload.translations.description);
            value.sourceCodeUrl = filterUrlMap(payload.translations.sourceCodeUrl);
            value.copyright = filterMap(payload.translations.copyright);

            const shouldRemoveLogo = Boolean(payload.removeLogo) && !logoFile;
            if (shouldRemoveLogo && value.logoFileId) {
                const existing = await File.find(value.logoFileId, { client: trx });
                if (existing) {
                    await this.fileService.delete(existing);
                    await existing.delete();
                }
                value.logoFileId = null;
            }

            if (logoFile && logoFile.tmpPath) {
                if (value.logoFileId) {
                    const existing = await File.find(value.logoFileId, { client: trx });
                    if (existing) {
                        await this.fileService.delete(existing);
                        await existing.delete();
                    }
                    value.logoFileId = null;
                }

                const originalExtension = path.extname(logoFile.clientName);
                const baseName = path.basename(logoFile.clientName, originalExtension);
                const sanitizedName = `${cuid()}-${this.slugifyService.slugify(baseName)}${originalExtension}`;
                const key = `organization/logo/${sanitizedName}`;
                const uploadMeta = await this.fileService.storeMultipartFile(logoFile, key);
                const resolvedMime =
                    uploadMeta.mimeType ||
                    (logoFile.type && logoFile.subtype ? `${logoFile.type}/${logoFile.subtype}` : null) ||
                    logoFile.headers?.['content-type'] ||
                    mime.lookup(sanitizedName) ||
                    'application/octet-stream';

                const storedLogo = await File.create(
                    {
                        name: sanitizedName,
                        path: key,
                        extension: originalExtension,
                        mimeType: resolvedMime,
                        size: uploadMeta.size,
                        type: FileTypeEnum.ORGANIZATION_LOGO,
                    },
                    { client: trx }
                );

                value.logoFileId = storedLogo.id;
            }

            record.merge({ value: value as unknown as Record<string, unknown> });
            await record.save();

            await trx.commit();

            return this.serializeOrganizationSettings(value);
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }
}
