import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';

interface LanguageInterface {
    name: string;
    code: string;
    isFallback?: boolean;
}

export default class Language extends BaseModel {
    public static LANGUAGE_ENGLISH: LanguageInterface = {
        name: 'English',
        code: 'en',
        isFallback: true,
    };

    public static LANGUAGE_FRENCH: LanguageInterface = {
        name: 'Français',
        code: 'fr',
    };

    @column({ isPrimary: true })
    declare id: string;

    @column()
    declare name: string;

    @column()
    declare code: string;

    @column()
    declare isFallback: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
