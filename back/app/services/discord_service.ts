import { inject } from '@adonisjs/core';
import DiscordSetting from '#models/discord_setting';
import logger from '@adonisjs/core/services/logger';

interface DiscordEventPayload {
    name: string;
    startTime: string;
    endTime?: string;
    description?: string;
    channelId?: string;
}

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
}

interface DiscordGuild {
    id: string;
    name: string;
}

@inject()
export default class DiscordService {
    private readonly DISCORD_API_BASE = 'https://discord.com/api/v10';

    public async getSettings(): Promise<DiscordSetting | null> {
        return await DiscordSetting.first();
    }

    public async updateSettings(data: { enabled: boolean; botToken?: string; guildId?: string; defaultChannelId?: string }): Promise<DiscordSetting> {
        let settings = await DiscordSetting.first();

        if (!settings) {
            settings = new DiscordSetting();
        }

        settings.enabled = data.enabled;

        if (data.botToken !== undefined && data.botToken.trim() !== '') {
            settings.botToken = data.botToken.trim();
        }

        if (data.guildId !== undefined) {
            settings.guildId = data.guildId || null;
        }

        if (data.defaultChannelId !== undefined) {
            settings.defaultChannelId = data.defaultChannelId || null;
        }

        await settings.save();
        return settings;
    }

    public async createEvent(payload: DiscordEventPayload): Promise<{ inviteUrl: string } | null> {
        const settings = await this.getSettings();

        if (!settings || !settings.enabled || !settings.botToken || !settings.guildId) {
            throw new Error('Discord integration is not configured');
        }

        try {
            const channelId = payload.channelId || settings.defaultChannelId;

            if (!channelId) {
                throw new Error('No channel specified and no default channel configured');
            }

            // Create Discord scheduled event
            const eventData = {
                name: payload.name,
                privacy_level: 2, // GUILD_ONLY
                scheduled_start_time: payload.startTime,
                scheduled_end_time: payload.endTime,
                description: payload.description || '',
                entity_type: 2, // VOICE
                channel_id: channelId,
            };

            const response = await fetch(`${this.DISCORD_API_BASE}/guilds/${settings.guildId}/scheduled-events`, {
                method: 'POST',
                headers: {
                    Authorization: `Bot ${settings.botToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                logger.error('Discord API error:', error);
                throw new Error(`Discord API error: ${response.status}`);
            }

            const event = (await response.json()) as { id: string };

            // Generate invite URL for the event
            const inviteUrl = `https://discord.gg/events/${settings.guildId}/${event.id}`;

            return { inviteUrl };
        } catch (error) {
            logger.error('Failed to create Discord event:', error);
            throw error;
        }
    }

    public async listGuilds(botToken: string): Promise<DiscordGuild[]> {
        try {
            // For bots, we need to use /users/@me/guilds endpoint
            // But bots only see guilds they're in
            const response = await fetch(`${this.DISCORD_API_BASE}/users/@me/guilds`, {
                headers: {
                    Authorization: `Bot ${botToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.text();
                logger.error(`Discord API error ${response.status}:`, errorData);
                throw new Error(`Discord API error: ${response.status} - ${errorData}`);
            }

            const guilds = (await response.json()) as DiscordGuild[];
            return guilds;
        } catch (error) {
            logger.error('Failed to list Discord guilds:', error);
            throw error;
        }
    }

    public async listChannels(guildId: string, botToken: string): Promise<DiscordChannel[]> {
        try {
            const response = await fetch(`${this.DISCORD_API_BASE}/guilds/${guildId}/channels`, {
                headers: {
                    Authorization: `Bot ${botToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Discord API error: ${response.status}`);
            }

            const channels = (await response.json()) as DiscordChannel[];
            // Filter only voice channels (type 2)
            return channels.filter((channel) => channel.type === 2);
        } catch (error) {
            logger.error('Failed to list Discord channels:', error);
            throw error;
        }
    }
}
