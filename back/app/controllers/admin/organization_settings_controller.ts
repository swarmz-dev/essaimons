import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import SettingsService from '#services/settings_service';
import { updateOrganizationSettingsValidator } from '#validators/admin/organization_settings';

@inject()
export default class OrganizationSettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    public async show({ response }: HttpContext) {
        const settings = await this.settingsService.getOrganizationSettings();
        return response.ok({ settings });
    }

    public async update({ request, response, i18n }: HttpContext) {
        const payload = await request.validateUsing(updateOrganizationSettingsValidator);

        const fallbackLocale = payload.fallbackLocale.trim().toLowerCase();

        const requiredFields: Array<keyof typeof payload> = ['name', 'description', 'sourceCodeUrl', 'copyright'];

        for (const field of requiredFields) {
            const translations = (payload as any)[field] as Record<string, string> | undefined;
            const value = translations?.[fallbackLocale]?.trim();
            if (!value) {
                return response.badRequest({
                    error: i18n.t('messages.admin.organization.update.error.missing', { locale: fallbackLocale, field }),
                });
            }
            if (field === 'sourceCodeUrl') {
                try {
                    new URL(value);
                } catch (error) {
                    return response.badRequest({
                        error: i18n.t('messages.admin.organization.update.error.invalid-url', { locale: fallbackLocale }),
                    });
                }
            }
        }

        const settingsPayload: any = {
            fallbackLocale,
            translations: {
                name: payload.name ?? {},
                description: payload.description ?? {},
                sourceCodeUrl: payload.sourceCodeUrl ?? {},
                copyright: payload.copyright ?? {},
            },
        };

        if (payload.propositionDefaults) {
            settingsPayload.propositionDefaults = payload.propositionDefaults;
        }
        if (payload.permissions?.perStatus) {
            settingsPayload.permissions = payload.permissions.perStatus;
        }
        if (payload.permissionCatalog?.perStatus) {
            settingsPayload.permissionCatalog = payload.permissionCatalog.perStatus;
        }
        if (payload.workflowAutomation) {
            settingsPayload.workflowAutomation = payload.workflowAutomation;
        }

        const settings = await this.settingsService.updateOrganizationSettings(settingsPayload, payload.logo);

        return response.ok({
            settings,
            message: i18n.t('messages.admin.organization.update.success'),
        });
    }
}
