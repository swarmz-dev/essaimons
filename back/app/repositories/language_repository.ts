import BaseRepository from '#repositories/base/base_repository';
import Language from '#models/language';

export default class LanguageRepository extends BaseRepository<typeof Language> {
    constructor() {
        super(Language);
    }
}
