import axios from 'axios';
import env from '#start/env';
import User from '#models/user';
import { I18n } from '@adonisjs/i18n';
import logger from '@adonisjs/core/services/logger';

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

    private mockMode: boolean = env.get('MAIL_MOCK', false);

    private async dispatchEmail(payload: Record<string, unknown>): Promise<void> {
        if (this.mockMode) {
            console.info('[MAIL MOCK]', JSON.stringify(payload, null, 2));
            return;
        }

        logger.debug('Sending email via Brevo', {
            to: payload.to,
            subject: payload.subject,
            htmlContent: payload.htmlContent,
            textContent: payload.textContent,
        });

        await axios.post(this.apiUrl, payload, {
            headers: this.headers,
        });

        logger.info('Email sent successfully via Brevo', {
            to: payload.to,
            subject: payload.subject,
        });
    }

    /**
     * Sends a password reset email to a user with a given URI for resetting.
     *
     * @param {User} user - The user object containing the email to send to.
     * @param {string} uri - The URI link included in the reset password email.
     * @param {I18n} i18n - The i18n instance used to translate the email subject.
     * @returns {Promise<void>} Resolves when the email has been sent.
     */
    public async sendResetPasswordEmail(user: User, uri: string, i18n: I18n): Promise<void> {
        await this.dispatchEmail({
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
        });
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
        await this.dispatchEmail({
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
        });
    }

    /**
     * Send a generic transactional email
     */
    public async sendTransactionalEmail(payload: { to: { email: string; name?: string }[]; subject: string; htmlContent: string; textContent?: string }): Promise<void> {
        await this.dispatchEmail({
            sender: this.sender,
            to: payload.to,
            subject: payload.subject,
            htmlContent: payload.htmlContent,
            textContent: payload.textContent,
        });
    }
}
