import { HttpContext } from '@adonisjs/core/http';
import UserRepository from '#repositories/user_repository';
import UserTokenRepository from '#repositories/user_token_repository';
import BrevoMailService from '#services/brevo_mail_service';
import User from '#models/user';
import Proposition from '#models/proposition';
import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import File from '#models/file';
import { cuid } from '@adonisjs/core/helpers';
import FileService from '#services/file_service';
import SlugifyService from '#services/slugify_service';
import { resetPasswordParamsValidator, resetPasswordValidator, sendResetPasswordEmailValidator, updateProfileValidator } from '#validators/profile';
import path from 'node:path';
import env from '#start/env';
import { FileTypeEnum } from '#types/enum/file_type_enum';
import UserToken from '#models/user_token';
import { UserTokenTypeEnum } from '#types/enum/user_token_type_enum';
import mime from 'mime-types';

@inject()
export default class ProfileController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userTokenRepository: UserTokenRepository,
        private readonly mailService: BrevoMailService,
        private readonly fileService: FileService,
        private readonly slugifyService: SlugifyService
    ) {}

    public async getProfile({ response, user }: HttpContext) {
        return response.ok({
            user: user.apiSerialize(),
        });
    }

    public async sendResetPasswordEmail({ request, response, i18n }: HttpContext) {
        const { email } = await request.validateUsing(sendResetPasswordEmailValidator);

        const user: User | null = await this.userRepository.findOneBy({ email });

        if (!user) {
            return response.notFound({
                error: i18n.t('messages.profile.send-reset-password-email.error.unknown-email'),
            });
        }

        const previousToken: UserToken | null = await this.userTokenRepository.findOneBy({ userId: user.id, type: UserTokenTypeEnum.PASSWORD_RESET });
        if (previousToken) {
            if (previousToken.createdAt && previousToken.createdAt > DateTime.now().minus({ minutes: 5 })) {
                return response.ok({
                    message: i18n.t('messages.profile.send-reset-password-email.success'),
                });
            } else {
                await previousToken.delete();
            }
        }

        let token: string = cuid();
        await UserToken.create({
            userId: user.id,
            token,
            type: UserTokenTypeEnum.PASSWORD_RESET,
        });

        try {
            await this.mailService.sendResetPasswordEmail(user, encodeURI(`${env.get('FRONT_URI')}/reset-password/confirm?token=${token}`), i18n);
        } catch (error: any) {
            response.notFound({ error: i18n.t('profile.send-reset-password-email.error.mail-not-sent') });
        }

        return response.ok({
            message: i18n.t('messages.profile.send-reset-password-email.success'),
        });
    }

    public async resetPassword({ request, response, i18n }: HttpContext) {
        const { token } = await resetPasswordParamsValidator.validate(request.params());

        const userToken: UserToken = await this.userTokenRepository.firstOrFail(
            {
                token,
                type: UserTokenTypeEnum.PASSWORD_RESET,
            },
            ['user']
        );

        const { password } = await request.validateUsing(resetPasswordValidator);

        userToken.user.password = password;
        await userToken.user.save();

        await userToken.delete();

        return response.ok({
            message: i18n.t('messages.profile.reset.success'),
        });
    }

    public async updateProfile({ request, response, user, i18n }: HttpContext) {
        const { username, profilePicture } = await request.validateUsing(updateProfileValidator);

        user.username = username;

        if (profilePicture) {
            if (user.profilePictureId) {
                await this.fileService.delete(user.profilePicture);

                user.profilePictureId = null;
                await user.save();
                await user.profilePicture.delete();
            }

            const originalExtension = path.extname(profilePicture.clientName);
            const baseName = path.basename(profilePicture.clientName, originalExtension);
            const sanitizedName = `${cuid()}-${this.slugifyService.slugify(baseName)}${originalExtension}`;
            const key = `profile-picture/${sanitizedName}`;
            const uploadMeta = await this.fileService.storeMultipartFile(profilePicture, key);

            const resolvedMime =
                uploadMeta.mimeType ||
                (profilePicture.type && profilePicture.subtype ? `${profilePicture.type}/${profilePicture.subtype}` : null) ||
                mime.lookup(sanitizedName) ||
                'application/octet-stream';

            const newProfilePicture: File = await File.create({
                name: sanitizedName,
                path: key,
                extension: originalExtension,
                mimeType: resolvedMime,
                size: uploadMeta.size,
                type: FileTypeEnum.PROFILE_PICTURE,
            });
            await newProfilePicture.refresh();
            user.profilePictureId = newProfilePicture.id;
        }

        await user.save();
        await user.load('profilePicture');

        return response.ok({
            message: i18n.t('messages.profile.update-profile.success'),
            user: user.apiSerialize(),
        });
    }

    public async exportProfile({ response, user, i18n }: HttpContext) {
        try {
            await user.load('profilePicture');

            const createdPropositions: Proposition[] = await Proposition.query()
                .where('creator_id', user.id)
                .preload('categories')
                .preload('rescueInitiators')
                .preload('associatedPropositions')
                .preload('attachments')
                .preload('creator')
                .preload('visual');

            const participatingPropositions: Proposition[] = await Proposition.query()
                .whereHas('rescueInitiators', (builder) => {
                    builder.where('users.id', user.id);
                })
                .preload('categories')
                .preload('rescueInitiators')
                .preload('associatedPropositions')
                .preload('attachments')
                .preload('creator')
                .preload('visual');

            const createdIds = new Set(createdPropositions.map((proposition) => proposition.id));
            const uniqueParticipations = participatingPropositions.filter((proposition) => !createdIds.has(proposition.id));

            const exportedAt = DateTime.now().toISO();
            const payload = {
                metadata: {
                    version: 1,
                    exportedAt,
                },
                user: user.apiSerialize(),
                data: {
                    createdPropositions: createdPropositions.map((proposition) => proposition.apiSerialize()),
                    rescueInitiatedPropositions: uniqueParticipations.map((proposition) => proposition.apiSerialize()),
                },
            };

            const identifier = user.frontId !== undefined && user.frontId !== null ? `user-${user.frontId}` : user.id;
            const fileName = `user-export-${identifier}-${DateTime.now().toFormat('yyyyLLdd-HHmmss')}.json`;

            response.header('Content-Type', 'application/json');
            response.header('Content-Disposition', `attachment; filename="${fileName}"`);

            return response.send(payload);
        } catch (error) {
            console.error('profile.export.error', error);
            return response.badRequest({
                error: i18n.t('messages.profile.export.error.default'),
            });
        }
    }
}
