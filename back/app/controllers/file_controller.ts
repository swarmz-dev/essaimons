import { inject } from '@adonisjs/core';
import { HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import UserRepository from '#repositories/user_repository';
import User from '#models/user';
import { serveStaticProfilePictureFileValidator, serveStaticLanguageFlagFileValidator } from '#validators/file';
import cache from '@adonisjs/cache/services/main';
import LanguageRepository from '#repositories/language_repository';
import Language from '#models/language';

@inject()
export default class FileController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly languageRepository: LanguageRepository
    ) {}

    public async serveStaticProfilePictureFile({ request, response, i18n }: HttpContext) {
        const { userId } = await serveStaticProfilePictureFileValidator.validate(request.params());
        const user: User = await this.userRepository.firstOrFail({ frontId: userId });

        try {
            const filePath: string = await cache.getOrSet({
                key: `user-profile-picture:${user.id}`,
                ttl: '1h',
                factory: async (): Promise<string> => {
                    if (!user.profilePicture) {
                        throw new Error('NO_PICTURE');
                    }

                    return app.makePath(user.profilePicture.path);
                },
            });

            return response.download(filePath);
        } catch (error: any) {
            if (error.message === 'NO_PICTURE') {
                return response.notFound({ error: i18n.t('messages.file.serve-status-profile-picture-file.error') });
            }
        }
    }

    public async serveStaticLanguageFlagFile({ request, response }: HttpContext) {
        const { languageCode } = await serveStaticLanguageFlagFileValidator.validate(request.params());

        const filePath: string = await cache.getOrSet({
            key: `language-flag:${languageCode}`,
            tags: [`language:${languageCode}`],
            ttl: '1h',
            factory: async (): Promise<string> => {
                const language: Language = await this.languageRepository.firstOrFail({ code: languageCode });

                return app.makePath(language.flag.path);
            },
        });

        return response.download(filePath);
    }
}
