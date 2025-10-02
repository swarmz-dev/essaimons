import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';

export default class DiscordSetting extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare enabled: boolean;

    @column({ serializeAs: null })
    declare botToken: string | null;

    @column()
    declare guildId: string | null;

    @column()
    declare defaultChannelId: string | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    public apiSerialize() {
        return {
            enabled: this.enabled,
            guildId: this.guildId,
            defaultChannelId: this.defaultChannelId,
            hasBotToken: !!this.botToken,
        };
    }
}
