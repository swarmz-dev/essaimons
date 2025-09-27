import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import SettingsService from '#services/settings_service';

@inject()
export default class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    public async organization({ response }: HttpContext) {
        const settings = await this.settingsService.getOrganizationSettings();
        return response.ok({ settings });
    }
}
