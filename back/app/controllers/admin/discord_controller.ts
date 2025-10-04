import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import DiscordService from '#services/discord_service';
import { updateDiscordSettingsValidator } from '#validators/admin/discord/update_discord_settings';
import { listChannelsValidator } from '#validators/admin/discord/list_channels';

@inject()
export default class DiscordController {
    constructor(private readonly discordService: DiscordService) {}

    public async show({ response }: HttpContext): Promise<void> {
        const settings = await this.discordService.getSettings();
        return response.ok({ settings: settings?.apiSerialize() ?? null });
    }

    public async update({ request, response, i18n }: HttpContext): Promise<void> {
        try {
            const payload = await updateDiscordSettingsValidator.validate(request.all());
            const settings = await this.discordService.updateSettings(payload);

            return response.ok({
                message: i18n.t('messages.admin.discord.update.success'),
                settings: settings.apiSerialize(),
            });
        } catch (error) {
            return response.badRequest({
                error: error?.message ?? i18n.t('messages.admin.discord.update.error'),
            });
        }
    }

    public async listGuilds({ request, response, i18n }: HttpContext): Promise<void> {
        try {
            const botToken = request.input('botToken');

            if (!botToken) {
                return response.badRequest({ error: 'Bot token is required' });
            }

            const guilds = await this.discordService.listGuilds(botToken);
            return response.ok({ guilds });
        } catch (error) {
            return response.badRequest({
                error: error?.message ?? i18n.t('messages.admin.discord.list-guilds.error'),
            });
        }
    }

    public async listChannels({ request, response, i18n }: HttpContext): Promise<void> {
        try {
            const payload = await listChannelsValidator.validate(request.all());
            const channels = await this.discordService.listChannels(payload.guildId, payload.botToken);
            return response.ok({ channels });
        } catch (error) {
            return response.badRequest({
                error: error?.message ?? i18n.t('messages.admin.discord.list-channels.error'),
            });
        }
    }
}
