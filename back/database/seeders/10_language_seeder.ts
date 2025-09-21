import { BaseSeeder } from '@adonisjs/lucid/seeders';
import Language from '#models/language';
import LanguageRepository from '#repositories/language_repository';

export default class extends BaseSeeder {
    public async run(): Promise<void> {
        const languageRepository: LanguageRepository = new LanguageRepository();

        for (const language of [Language.LANGUAGE_ENGLISH, Language.LANGUAGE_FRENCH]) {
            if (!(await languageRepository.findOneBy({ code: language.code }))) {
                await Language.create({
                    name: language.name,
                    code: language.code,
                    isFallback: language.isFallback || false,
                });
            }
        }
    }
}
