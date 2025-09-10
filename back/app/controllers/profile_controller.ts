import { HttpContext } from '@adonisjs/core/http';
import UserRepository from '#repositories/user_repository';
import UserTokenRepository from '#repositories/user_token_repository';
import BrevoMailService from '#services/brevo_mail_service';
import User from '#models/user';
import { DateTime } from 'luxon';
import { inject } from '@adonisjs/core';
import File from '#models/file';
import app from '@adonisjs/core/services/app';
import { cuid } from '@adonisjs/core/helpers';
import FileService from '#services/file_service';
import SlugifyService from '#services/slugify_service';
import { resetPasswordParamsValidator, resetPasswordValidator, sendResetPasswordEmailValidator, updateProfileValidator } from '#validators/profile';
import path from 'node:path';
import env from '#start/env';
import FileTypeEnum from '#types/enum/file_type_enum';
import cache from '@adonisjs/cache/services/main';
import UserToken from '#models/user_token';
import UserTokenTypeEnum from '#types/enum/user_token_type_enum';
import SerializedUser from '#types/serialized/serialized_user';

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
            user: await cache.getOrSet({
                key: `user:${user.id}`,
                tags: [`user:${user.id}`],
                ttl: '1h',
                factory: (): SerializedUser => {
                    return user.apiSerialize();
                },
            }),
        });
    }

    public async sendResetPasswordEmail({ request, response, i18n }: HttpContext) {
        const { email } = await request.validateUsing(sendResetPasswordEmailValidator);

        const user: User = await this.userRepository.firstOrFail({ email });

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
                // Physically delete the file
                this.fileService.delete(user.profilePicture);

                // Database file clear
                user.profilePictureId = null;
                await user.save();
                await user.profilePicture.delete();
            }

            profilePicture.clientName = `${cuid()}-${this.slugifyService.slugify(profilePicture.clientName)}`;
            const profilePicturePath: string = `static/profile-picture`;
            await profilePicture.move(app.makePath(profilePicturePath));
            const newProfilePicture: File = await File.create({
                name: profilePicture.clientName,
                path: `${profilePicturePath}/${profilePicture.clientName}`,
                extension: path.extname(profilePicture.clientName),
                mimeType: `${profilePicture.type}/${profilePicture.subtype}`,
                size: profilePicture.size,
                type: FileTypeEnum.PROFILE_PICTURE,
            });
            await newProfilePicture.refresh();
            user.profilePictureId = newProfilePicture.id;

            await cache.deleteByTag({ tags: [`user:${user.id}`, `admin-users`, `admin-user:${user.id}`] });
            await cache.set({
                key: `user-profile-picture:${user.id}`,
                tags: [`user:${user.id}`],
                ttl: '1h',
                value: app.makePath(newProfilePicture.path),
            });
        }

        await user.save();
        await user.load('profilePicture');

        return response.ok({
            message: i18n.t('messages.profile.update-profile.success'),
            user: user.apiSerialize(),
        });
    }
}
