import { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import UserRepository from '#repositories/user_repository';
import User from '#models/user';
import { serveStaticProfilePictureFileValidator, serveStaticPropositionVisualFileValidator, serveStaticPropositionAttachmentFileValidator } from '#validators/file';
import PropositionRepository from '#repositories/proposition_repository';
import File from '#models/file';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import Proposition from '#models/proposition';
import FileService from '#services/file_service';

@inject()
export default class FileController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly propositionRepository: PropositionRepository,
        private readonly fileService: FileService
    ) {}

    public async serveStaticProfilePictureFile({ request, response, i18n }: HttpContext) {
        const { userId } = await serveStaticProfilePictureFileValidator.validate(request.params());
        const user: User = await this.userRepository.firstOrFail({ frontId: userId });

        try {
            if (!user.profilePicture) {
                throw new Error('NO_PICTURE');
            }

            try {
                const { stream, contentType, contentLength } = await this.fileService.stream(user.profilePicture.path);
                if (contentType) {
                    response.header('Content-Type', contentType);
                }
                if (contentLength) {
                    response.header('Content-Length', contentLength.toString());
                }

                return response.stream(stream);
            } catch (error) {
                return response.notFound({ error: i18n.t('messages.file.serve-status-profile-picture-file.error') });
            }
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

        try {
            const { stream, contentType, contentLength } = await this.fileService.stream(proposition.visual.path);
            if (contentType) {
                response.header('Content-Type', contentType);
            }
            if (contentLength) {
                response.header('Content-Length', contentLength.toString());
            }

            return response.stream(stream);
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

        try {
            const { stream, contentType, contentLength } = await this.fileService.stream(file.path);
            if (contentType) {
                response.header('Content-Type', contentType);
            }
            if (contentLength) {
                response.header('Content-Length', contentLength.toString());
            }

            return response.stream(stream);
        } catch (error) {
            return response.notFound({ error: i18n.t('messages.file.serve-static-proposition-attachment.error') });
        }
    }
}
