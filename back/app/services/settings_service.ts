import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import path from 'node:path';
import { cuid } from '@adonisjs/core/helpers';
import mime from 'mime-types';
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
    name: string | null;
    description: string | null;
    sourceCodeUrl: string | null;
    copyright: string | null;
    logoFileId: string | null;
}

interface UpdateOrganizationSettingsPayload {
    name?: string | null;
    description?: string | null;
    sourceCodeUrl?: string | null;
    copyright?: string | null;
    removeLogo?: boolean;
}

@inject()
export default class SettingsService {
    constructor(
        private readonly settingRepository: SettingRepository,
        private readonly fileService: FileService,
        private readonly slugifyService: SlugifyService
    ) {}

    private normalizeString(value?: string | null): string | null {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }

    private async serializeOrganizationSettings(value: OrganizationSettingsValue | null): Promise<SerializedOrganizationSettings> {
        if (!value) {
            return {
                name: null,
                description: null,
                sourceCodeUrl: null,
                copyright: null,
                logo: null,
            };
        }

        let logo: SerializedOrganizationSettings['logo'] = null;

        if (value.logoFileId) {
            const file = await File.find(value.logoFileId);
            if (file) {
                logo = file.apiSerialize();
            }
        }

        return {
            name: value.name,
            description: value.description,
            sourceCodeUrl: value.sourceCodeUrl,
            copyright: value.copyright,
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
            let record = await this.settingRepository.findByKey(ORGANIZATION_SETTINGS_KEY, trx);
            let value: OrganizationSettingsValue = {
                name: null,
                description: null,
                sourceCodeUrl: null,
                copyright: null,
                logoFileId: null,
            };

            if (record) {
                value = {
                    ...value,
                    ...((record.value as unknown as OrganizationSettingsValue) ?? {}),
                };
            } else {
                record = await Setting.create(
                    {
                        key: ORGANIZATION_SETTINGS_KEY,
                        value: value as unknown as Record<string, unknown>,
                    },
                    { client: trx }
                );
            }

            const normalized: OrganizationSettingsValue = {
                name: value.name,
                description: value.description,
                sourceCodeUrl: value.sourceCodeUrl,
                copyright: value.copyright,
                logoFileId: value.logoFileId,
            };

            if (payload.name !== undefined) {
                normalized.name = this.normalizeString(payload.name);
            }

            if (payload.description !== undefined) {
                normalized.description = this.normalizeString(payload.description);
            }

            if (payload.sourceCodeUrl !== undefined) {
                normalized.sourceCodeUrl = this.normalizeString(payload.sourceCodeUrl);
                if (normalized.sourceCodeUrl) {
                    try {
                        // Validate that the URL is well formed
                        new URL(normalized.sourceCodeUrl);
                    } catch {
                        normalized.sourceCodeUrl = null;
                    }
                }
            }

            if (payload.copyright !== undefined) {
                normalized.copyright = this.normalizeString(payload.copyright);
            }

            const shouldRemoveLogo = Boolean(payload.removeLogo) && !logoFile;
            if (shouldRemoveLogo && normalized.logoFileId) {
                const existing = await File.find(normalized.logoFileId, { client: trx });
                if (existing) {
                    await this.fileService.delete(existing);
                    await existing.delete();
                }
                normalized.logoFileId = null;
            }

            if (logoFile && logoFile.tmpPath) {
                if (normalized.logoFileId) {
                    const existing = await File.find(normalized.logoFileId, { client: trx });
                    if (existing) {
                        await this.fileService.delete(existing);
                        await existing.delete();
                    }
                    normalized.logoFileId = null;
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

                normalized.logoFileId = storedLogo.id;
            }

            record.merge({ value: normalized as unknown as Record<string, unknown> });
            await record.save();

            await trx.commit();

            return this.serializeOrganizationSettings(normalized);
        } catch (error) {
            await trx.rollback();
            throw error;
        }
    }
}
