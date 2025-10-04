import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import DiscordService from '#services/discord_service';
import { createDiscordEventValidator } from '#validators/discord/create_discord_event';

@inject()
export default class DiscordEventController {
    constructor(private readonly discordService: DiscordService) {}

    public async create({ request, response, i18n }: HttpContext): Promise<void> {
        try {
            const payload = await createDiscordEventValidator.validate(request.all());
            const result = await this.discordService.createEvent(payload);

            if (!result) {
                return response.badRequest({
                    error: i18n.t('messages.discord.create-event.error.not-configured'),
                });
            }

            return response.created({
                message: i18n.t('messages.discord.create-event.success'),
                inviteUrl: result.inviteUrl,
            });
        } catch (error) {
            return response.badRequest({
                error: error?.message ?? i18n.t('messages.discord.create-event.error.default'),
            });
        }
    }
}
