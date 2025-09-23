import { HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import UserRepository from '#repositories/user_repository';
import User from '#models/user';
import { serveStaticProfilePictureFileValidator, serveStaticPropositionVisualFileValidator, serveStaticPropositionAttachmentFileValidator } from '#validators/file';
import PropositionRepository from '#repositories/proposition_repository';
import File from '#models/file';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import Proposition from '#models/proposition';

export default class FileController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly propositionRepository: PropositionRepository
    ) {}

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

    public async serveStaticPropositionVisualFile({ request, response, i18n }: HttpContext) {
        const { propositionId } = await serveStaticPropositionVisualFileValidator.validate(request.params());

        const proposition: Proposition | null = await this.propositionRepository.findByPublicId(propositionId, ['visual']);

        if (!proposition || !proposition.visual) {
            return response.notFound({ error: i18n.t('messages.file.serve-static-proposition-visual.error') });
        }

        const filePath: string = app.makePath(proposition.visual.path);

        try {
            return response.download(filePath);
        } catch (error) {
            return response.notFound({ error: i18n.t('messages.file.serve-static-proposition-visual.error') });
        }
    }

    public async serveStaticPropositionAttachmentFile({ request, response, i18n }: HttpContext) {
        const { attachmentId } = await serveStaticPropositionAttachmentFileValidator.validate(request.params());

        const file: File | null = await File.find(attachmentId);

        if (!file || file.type !== FileTypeEnum.PROPOSITION_ATTACHMENT) {
            return response.notFound({ error: i18n.t('messages.file.serve-static-proposition-attachment.error') });
        }

        const filePath: string = app.makePath(file.path);

        try {
            return response.download(filePath);
        } catch (error) {
            return response.notFound({ error: i18n.t('messages.file.serve-static-proposition-attachment.error') });
        }
    }
}
