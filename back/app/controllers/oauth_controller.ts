import { HttpContext } from '@adonisjs/core/http';
import { GithubDriver } from '@adonisjs/ally/drivers/github';
import { DiscordDriver } from '@adonisjs/ally/drivers/discord';
import { GoogleDriver } from '@adonisjs/ally/drivers/google';
import FileService from '#services/file_service';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import File from '#models/file';
import User from '#models/user';
import UserRoleEnum from '#types/enum/user_role_enum';
import env from '#start/env';
import UserRepository from '#repositories/user_repository';
import { I18n } from '@adonisjs/i18n';
import FileTypeEnum from '#types/enum/file_type_enum';
import { cuid } from '@adonisjs/core/helpers';
import { confirmOauthConnectionValidator } from '#validators/oauth';
import { AccessToken } from '@adonisjs/auth/access_tokens';
import StringService from '#services/string_service';
import UserTokenRepository from '#repositories/user_token_repository';
import UserToken from '#models/user_token';
import { DateTime } from 'luxon';
import UserTokenTypeEnum from '#types/enum/user_token_type_enum';
import cache from '@adonisjs/cache/services/main';

@inject()
export default class OauthController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userTokenRepository: UserTokenRepository,
        private readonly fileService: FileService,
        private readonly stringService: StringService
    ) {}

    public async github({ ally }: HttpContext): Promise<void> {
        return ally.use('github').redirect();
    }

    public async githubCallback({ ally, response, i18n }: HttpContext) {
        const client: GithubDriver = ally.use('github');
        const { error, token } = await this.handleCallback(client, i18n);
        if (error) {
            return response.badRequest({ error });
        }

        return response.redirect(`${env.get('FRONT_URI')}/en/oauth?token=${token}&provider=github`);
    }

    public async discord({ ally }: HttpContext): Promise<void> {
        return ally.use('discord').redirect();
    }

    public async discordCallback({ ally, response, i18n }: HttpContext) {
        const client: DiscordDriver = ally.use('discord');
        const { error, token } = await this.handleCallback(client, i18n);
        if (error) {
            return response.badRequest({ error });
        }

        return response.redirect(`${env.get('FRONT_URI')}/en/oauth?token=${token}&provider=discord`);
    }

    public async google({ ally }: HttpContext): Promise<void> {
        return ally.use('google').redirect();
    }

    public async googleCallback({ ally, response, i18n }: HttpContext) {
        const client: GoogleDriver = ally.use('google');
        const { error, token } = await this.handleCallback(client, i18n);
        if (error) {
            return response.badRequest({ error });
        }

        return response.redirect(`${env.get('FRONT_URI')}/en/oauth?token=${token}&provider=google`);
    }

    public async confirmOauthConnection({ request, response, i18n }: HttpContext) {
        const { provider, token: creationToken } = await confirmOauthConnectionValidator.validate(request.params());

        const oauthToken: UserToken | null = await this.userTokenRepository.findOneBy({ token: creationToken, type: UserTokenTypeEnum.OAUTH }, ['user']);
        if (!oauthToken) {
            return response.notFound({ error: i18n.t('messages.oauth.confirm.error.invalid-token') });
        } else if (oauthToken.createdAt < DateTime.now().minus({ minutes: 5 })) {
            await oauthToken.delete();
            return response.badRequest({ error: i18n.t('messages.oauth.confirm.error.token-expired') });
        }

        const user: User = oauthToken.user;
        const token: AccessToken = await User.accessTokens.create(user);

        await oauthToken.delete();

        return response.ok({
            message: i18n.t('messages.oauth.confirm.success', { provider: this.stringService.capitalize(provider) }),
            token,
            user: user.apiSerialize(),
        });
    }

    private async handleCallback(client: GithubDriver | DiscordDriver | GoogleDriver, i18n: I18n): Promise<{ error?: string; token?: string }> {
        // User has denied access by canceling the login flow
        if (client.accessDenied()) {
            return { error: i18n.t('messages.oauth.callback.error.access-denied') };
        }

        // OAuth state verification failed. This happens when the CSRF cookie gets expired.
        if (client.stateMisMatch()) {
            return { error: i18n.t('messages.oauth.callback.error.state-mismatch') };
        }

        // Client responded with some error
        if (client.hasError()) {
            return { error: client.getError() ?? i18n.t('messages.oauth.callback.error.default') };
        }

        const oauthUser = await client.user();
        let user: User | null = await this.userRepository.findOneBy({ email: oauthUser.email });
        if (user) {
            await this.revokeAccessToken(user);

            if (!user.isOauth) {
                user.isOauth = true;
            }

            const token: string = cuid();

            await UserToken.create({
                userId: user.id,
                token,
                type: UserTokenTypeEnum.OAUTH,
            });
            user.isOauth = true;
            await user.save();

            return { token };
        }

        let profilePicture: File | null = null;

        if (oauthUser.avatarUrl) {
            profilePicture = await this.storeAndGetFileFromUrl(oauthUser.avatarUrl);
        }

        const token: string = cuid();

        const createdUser: User = await User.create({
            username: oauthUser.nickName,
            email: oauthUser.email,
            isOauth: true,
            profilePictureId: profilePicture?.id,
            enabled: true,
            acceptedTermsAndConditions: true,
            role: UserRoleEnum.USER,
        });
        await createdUser.refresh();
        await cache.deleteByTag({ tags: ['not-friends', `admin-users`] });

        await UserToken.create({
            userId: createdUser.id,
            token,
            type: UserTokenTypeEnum.OAUTH,
        });

        return { token };
    }

    private async storeAndGetFileFromUrl(url: string): Promise<File> {
        const profilePicturePath: string = await this.fileService.saveOauthProfilePictureFromUrl(url);
        const { size, mimeType, extension, name } = await this.fileService.getFileInfo(app.makePath(profilePicturePath));

        const profilePicture: File | null = await File.create({
            name,
            path: profilePicturePath,
            extension,
            mimeType,
            size,
            type: FileTypeEnum.PROFILE_PICTURE,
        });

        return await profilePicture.refresh();
    }

    private async revokeAccessToken(user: User): Promise<void> {
        if (user.currentAccessToken) {
            await User.accessTokens.delete(user, user.currentAccessToken.identifier);
        }
    }
}
