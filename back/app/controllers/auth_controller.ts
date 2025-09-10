import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import { AccessToken } from '@adonisjs/auth/access_tokens';
import { inject } from '@adonisjs/core';
import UserRoleEnum from '#types/enum/user_role_enum';
import { DateTime } from 'luxon';
import UserRepository from '#repositories/user_repository';
import { confirmAccountCreationValidator, loginValidator, sendAccountCreationEmailValidator } from '#validators/auth';
import BrevoMailService from '#services/brevo_mail_service';
import env from '#start/env';
import { cuid } from '@adonisjs/core/helpers';
import UserToken from '#models/user_token';
import UserTokenTypeEnum from '#types/enum/user_token_type_enum';
import UserTokenRepository from '#repositories/user_token_repository';

@inject()
export default class AuthController {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userTokenRepository: UserTokenRepository,
        private readonly mailService: BrevoMailService
    ) {}

    public async login({ request, response, i18n }: HttpContext) {
        try {
            const { email, password } = await request.validateUsing(loginValidator);

            const user: User = await User.verifyCredentials(email, password);

            const token: AccessToken = await User.accessTokens.create(user);

            return response.ok({
                message: i18n.t('messages.auth.login.success'),
                token,
                user: user.apiSerialize(),
            });
        } catch (error: any) {
            return response.unauthorized({ error: i18n.t('messages.auth.login.error') });
        }
    }

    public async logout({ auth, response, i18n }: HttpContext) {
        const user: User = await auth.use('api').authenticate();
        await User.accessTokens.delete(user, user.currentAccessToken!.identifier);

        return response.ok({ message: i18n.t('messages.auth.logout.success') });
    }

    public async sendAccountCreationEmail({ request, response, language, i18n }: HttpContext) {
        const { username, email, password, consent } = await request.validateUsing(sendAccountCreationEmailValidator);

        if (!consent) {
            return response.badRequest({ error: i18n.t('messages.auth.send-account-creation-email.error.consent-required') });
        }

        const creationAccountToken: UserToken | null = await this.userTokenRepository.findOneByEmailAndType(email, UserTokenTypeEnum.ACCOUNT_CREATION);

        if (creationAccountToken) {
            if (creationAccountToken.user.enabled) {
                return response.conflict({ error: i18n.t('messages.auth.send-account-creation-email.error.email-already-in-use') });
            }

            if (creationAccountToken.createdAt > DateTime.now().minus({ minutes: 5 })) {
                return response.ok({ message: i18n.t('messages.auth.send-account-creation-email.success') });
            }

            await creationAccountToken.delete();
        }

        let existingUser: User | null = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            if (existingUser.enabled) {
                return response.conflict({ error: i18n.t('messages.auth.send-account-creation-email.error.email-already-in-use') });
            }
        } else {
            existingUser = await User.create({
                username,
                email,
                password,
                role: UserRoleEnum.USER,
                acceptedTermsAndConditions: true,
            });
            await existingUser.refresh();
        }

        try {
            const token: string = cuid();
            await UserToken.create({
                userId: existingUser.id,
                token,
                type: UserTokenTypeEnum.ACCOUNT_CREATION,
            });

            await this.mailService.sendAccountCreationEmail(existingUser, encodeURI(`${env.get('FRONT_URI')}/${language.code}/create-account/confirm?token=${token}`), i18n);
        } catch (error: any) {
            return response.badGateway({ error: i18n.t('messages.auth.send-account-creation-email.error.mail-not-sent') });
        }

        return response.ok({ message: i18n.t('messages.auth.send-account-creation-email.success') });
    }

    public async confirmAccountCreation({ request, response, i18n }: HttpContext) {
        const { token: creationToken } = await confirmAccountCreationValidator.validate(request.params());

        const token: UserToken | null = await this.userTokenRepository.findOneBy({ token: creationToken }, ['user']);
        if (!token) {
            return response.notFound({ error: i18n.t('messages.auth.confirm-account-creation.error.invalid-token') });
        } else if (token.createdAt < DateTime.now().minus({ minutes: 5 })) {
            return response.badRequest({ error: i18n.t('messages.auth.confirm-account-creation.error.token-expired') });
        }

        const user: User = token.user;

        token.user.enabled = true;
        await token.user.save();
        await token.delete();

        const accessToken: AccessToken = await User.accessTokens.create(user);

        return response.ok({
            message: i18n.t('messages.auth.confirm-account-creation.success'),
            token: accessToken,
            user: user.apiSerialize(),
        });
    }
}
