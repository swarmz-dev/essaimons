import { HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import UserRepository from '#repositories/user_repository';
import User from '#models/user';
import { serveStaticProfilePictureFileValidator } from '#validators/file';

export default class FileController {
    constructor(private readonly userRepository: UserRepository) {}

    public async serveStaticProfilePictureFile({ request, response, i18n }: HttpContext) {
        const { userId } = await serveStaticProfilePictureFileValidator.validate(request.params());
        const user: User = await this.userRepository.firstOrFail({ frontId: userId });

        try {
            if (!user.profilePicture) {
                throw new Error('NO_PICTURE');
            }

            return response.download(app.makePath(user.profilePicture.path));
        } catch (error: any) {
            if (error.message === 'NO_PICTURE') {
                return response.notFound({ error: i18n.t('messages.file.serve-status-profile-picture-file.error') });
            }
        }
    }
}
