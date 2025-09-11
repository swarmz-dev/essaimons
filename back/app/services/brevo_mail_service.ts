import axios from 'axios';
import env from '#start/env';
import User from '#models/user';
import { I18n } from '@adonisjs/i18n';

export default class BrevoMailService {
    private apiUrl: string = 'https://api.brevo.com/v3/smtp/email';

    private sender: object = {
        name: 'Essaimons V1',
        email: env.get('ACCOUNT_SENDER_EMAIL'),
    };

    private headers: object = {
        'Api-Key': `${env.get('BREVO_API_KEY')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };

    /**
     * Sends a password reset email to a user with a given URI for resetting.
     *
     * @param {User} user - The user object containing the email to send to.
     * @param {string} uri - The URI link included in the reset password email.
     * @param {I18n} i18n - The i18n instance used to translate the email subject.
     * @returns {Promise<void>} Resolves when the email has been sent.
     */
    public async sendResetPasswordEmail(user: User, uri: string, i18n: I18n): Promise<void> {
        await axios.post(
            this.apiUrl,
            {
                sender: this.sender,
                to: [
                    {
                        name: user.username,
                        email: user.email,
                    },
                ],
                templateId: 7,
                subject: i18n.t('messages.profile.send-reset-password-email.subject'),
                params: {
                    uri,
                },
            },
            {
                headers: this.headers,
            }
        );
    }

    /**
     * Sends an account creation email to a specified email address with a given URI.
     *
     * @param {User} user - The user object containing the email to send to.
     * @param {string} uri - The URI link included in the account creation email.
     * @param {I18n} i18n - The i18n instance used to translate the email subject.
     * @returns {Promise<void>} Resolves when the email has been sent.
     */
    public async sendAccountCreationEmail(user: User, uri: string, i18n: I18n): Promise<void> {
        await axios.post(
            this.apiUrl,
            {
                sender: this.sender,
                to: [
                    {
                        name: user.username,
                        email: user.email,
                    },
                ],
                templateId: 2,
                subject: i18n.t('messages.auth.send-account-creation-email.subject'),
                params: {
                    uri,
                },
            },
            {
                headers: this.headers,
            }
        );
    }
}
