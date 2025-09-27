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

        const settings = await this.settingsService.updateOrganizationSettings(
            {
                name: payload.name ?? null,
                description: payload.description ?? null,
                sourceCodeUrl: payload.sourceCodeUrl ?? null,
                copyright: payload.copyright ?? null,
                removeLogo: payload.removeLogo,
            },
            payload.logo
        );

        return response.ok({
            settings,
            message: i18n.t('messages.admin.organization.update.success'),
        });
    }
}
