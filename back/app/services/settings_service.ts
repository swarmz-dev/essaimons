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
    propositionDefaults?: {
        clarificationOffsetDays: number;
        improvementOffsetDays: number;
        voteOffsetDays: number;
        mandateOffsetDays: number;
        evaluationOffsetDays: number;
    };
    permissions?: Record<string, Record<string, boolean>>;
}

interface UpdateOrganizationSettingsPayload {
    fallbackLocale: string;
    translations: {
        name: Record<string, string>;
        description: Record<string, string>;
        sourceCodeUrl: Record<string, string>;
        copyright: Record<string, string>;
    };
    propositionDefaults?: {
        clarificationOffsetDays: number;
        improvementOffsetDays: number;
        voteOffsetDays: number;
        mandateOffsetDays: number;
        evaluationOffsetDays: number;
    };
    permissions?: Record<string, Record<string, boolean>>;
}

const DEFAULT_PROPOSITION_DEFAULTS = {
    clarificationOffsetDays: 7,
    improvementOffsetDays: 15,
    voteOffsetDays: 7,
    mandateOffsetDays: 15,
    evaluationOffsetDays: 30,
};

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    draft: {
        'initiator.edit_proposition': true,
        'initiator.publish': true,
        'initiator.manage_files': true,
        'initiator.manage_comments': true,
    },
    clarify: {
        'initiator.edit_proposition': true,
        'initiator.manage_comments': true,
        'contributor.comment_clarification': true,
    },
    amend: {
        'initiator.edit_proposition': true,
        'initiator.manage_events': true,
        'initiator.manage_comments': true,
        'contributor.comment_amendment': true,
    },
    vote: {
        'initiator.configure_vote': true,
        'initiator.manage_comments': true,
        'contributor.participate_vote': true,
    },
    mandate: {
        'initiator.manage_mandates': true,
        'initiator.manage_comments': true,
        'contributor.participate_vote': true,
        'mandated.candidate': true,
        'contributor.comment_mandate': true,
    },
    evaluate: {
        'initiator.manage_deliverables': true,
        'initiator.manage_comments': true,
        'mandated.upload_deliverable': true,
        'mandated.comment_evaluation': true,
        'contributor.evaluate_deliverable': true,
        'contributor.comment_evaluation': true,
        'contributor.request_revocation': true,
    },
    archived: {
        'admin.purge': true,
    },
};

@inject()
export default class SettingsService {
    private cachedPermissions: Record<string, Record<string, boolean>> | null = null;

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

        const normalizeOffsets = (input?: Partial<OrganizationSettingsValue['propositionDefaults']>): SerializedOrganizationSettings['propositionDefaults'] => {
            const fallback = { ...DEFAULT_PROPOSITION_DEFAULTS };
            if (!input) {
                return fallback;
            }

            const normalize = (value: unknown, defaultValue: number): number => {
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                    return Math.floor(parsed);
                }
                return defaultValue;
            };

            return {
                clarificationOffsetDays: normalize(input.clarificationOffsetDays, fallback.clarificationOffsetDays),
                improvementOffsetDays: normalize(input.improvementOffsetDays, fallback.improvementOffsetDays),
                voteOffsetDays: normalize(input.voteOffsetDays, fallback.voteOffsetDays),
                mandateOffsetDays: normalize(input.mandateOffsetDays, fallback.mandateOffsetDays),
                evaluationOffsetDays: normalize(input.evaluationOffsetDays, fallback.evaluationOffsetDays),
            };
        };

        if (value?.logoFileId) {
            const file = await File.find(value.logoFileId);
            if (file) {
                logo = file.apiSerialize();
            }
        }

        const permissions = this.mergePermissions(DEFAULT_PERMISSIONS, value?.permissions);

        return {
            fallbackLocale,
            locales,
            name: value?.name ?? {},
            description: value?.description ?? {},
            sourceCodeUrl: value?.sourceCodeUrl ?? {},
            copyright: value?.copyright ?? {},
            logo,
            propositionDefaults: normalizeOffsets(value?.propositionDefaults),
            permissions,
        };
    }

    public async getOrganizationSettings(): Promise<SerializedOrganizationSettings> {
        const record = await this.settingRepository.findByKey(ORGANIZATION_SETTINGS_KEY);
        const value = (record?.value as unknown as OrganizationSettingsValue | null | undefined) ?? null;
        return this.serializeOrganizationSettings(value);
    }

    public async getWorkflowPermissions(): Promise<Record<string, Record<string, boolean>>> {
        if (this.cachedPermissions) {
            return this.cachedPermissions;
        }

        const record = await this.settingRepository.findByKey(ORGANIZATION_SETTINGS_KEY);
        const value = (record?.value as unknown as OrganizationSettingsValue | null | undefined) ?? null;
        this.cachedPermissions = this.mergePermissions(DEFAULT_PERMISSIONS, value?.permissions);
        return this.cachedPermissions;
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
                propositionDefaults: { ...DEFAULT_PROPOSITION_DEFAULTS },
                permissions: this.mergePermissions(DEFAULT_PERMISSIONS),
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
                        propositionDefaults: currentValue.propositionDefaults ?? { ...DEFAULT_PROPOSITION_DEFAULTS },
                        permissions: this.mergePermissions(DEFAULT_PERMISSIONS, currentValue.permissions),
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

            if (payload.permissions) {
                value.permissions = this.mergePermissions(value.permissions ?? DEFAULT_PERMISSIONS, payload.permissions);
            }

            const normalizeOffset = (value: unknown, fallback: number): number => {
                const parsed = Number(value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                    return Math.floor(parsed);
                }
                return fallback;
            };

            const defaults = payload.propositionDefaults;
            value.propositionDefaults = {
                clarificationOffsetDays: normalizeOffset(defaults?.clarificationOffsetDays, value.propositionDefaults?.clarificationOffsetDays ?? DEFAULT_PROPOSITION_DEFAULTS.clarificationOffsetDays),
                improvementOffsetDays: normalizeOffset(defaults?.improvementOffsetDays, value.propositionDefaults?.improvementOffsetDays ?? DEFAULT_PROPOSITION_DEFAULTS.improvementOffsetDays),
                voteOffsetDays: normalizeOffset(defaults?.voteOffsetDays, value.propositionDefaults?.voteOffsetDays ?? DEFAULT_PROPOSITION_DEFAULTS.voteOffsetDays),
                mandateOffsetDays: normalizeOffset(defaults?.mandateOffsetDays, value.propositionDefaults?.mandateOffsetDays ?? DEFAULT_PROPOSITION_DEFAULTS.mandateOffsetDays),
                evaluationOffsetDays: normalizeOffset(defaults?.evaluationOffsetDays, value.propositionDefaults?.evaluationOffsetDays ?? DEFAULT_PROPOSITION_DEFAULTS.evaluationOffsetDays),
            };

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

            this.cachedPermissions = this.mergePermissions(DEFAULT_PERMISSIONS, value.permissions);

            return this.serializeOrganizationSettings(value);
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }

    private mergePermissions(base: Record<string, Record<string, boolean>>, overrides?: Record<string, Record<string, boolean>>): Record<string, Record<string, boolean>> {
        const result: Record<string, Record<string, boolean>> = {};

        for (const [status, actions] of Object.entries(base ?? {})) {
            result[status] = { ...actions };
        }

        for (const [status, actions] of Object.entries(overrides ?? {})) {
            if (!actions || typeof actions !== 'object') {
                continue;
            }

            if (!result[status]) {
                result[status] = {};
            }

            for (const [action, allowed] of Object.entries(actions)) {
                if (typeof allowed === 'boolean') {
                    result[status][action] = allowed;
                }
            }
        }

        return result;
    }
}
