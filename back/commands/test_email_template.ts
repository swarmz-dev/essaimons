import { BaseCommand } from '@adonisjs/core/ace';
import { CommandOptions } from '@adonisjs/core/types/ace';
import EmailTemplateService from '#services/email_template_service';
import Notification from '#models/notification';
import i18nManager from '@adonisjs/i18n/services/main';
import { NotificationTypeEnum } from '#types';

export default class TestEmailTemplate extends BaseCommand {
    static commandName = 'test:email-template';
    static description = 'Test email template rendering with sample data';

    static options: CommandOptions = {
        startApp: true,
    };

    async run() {
        const emailTemplateService = await this.app.container.make(EmailTemplateService);

        this.logger.info('Testing email template rendering...');

        // Create a sample notification (not saved to DB)
        const sampleNotification = new Notification();
        sampleNotification.id = 'test-id';
        sampleNotification.type = NotificationTypeEnum.COMMENT_ADDED;
        sampleNotification.titleKey = 'messages.notifications.comment_added.title';
        sampleNotification.bodyKey = 'messages.notifications.comment_added.message';
        sampleNotification.interpolationData = {
            username: 'Jean Dupont',
            propositionTitle: 'Ma super proposition',
        };
        sampleNotification.actionUrl = '/propositions/test-123';

        // Test French locale
        this.logger.info('--- Testing French locale ---');
        const i18nFr = i18nManager.locale('fr');
        const resultFr = await emailTemplateService.renderSingleNotification(sampleNotification, i18nFr, 'fr');

        this.logger.info(`Subject: ${resultFr.subject}`);
        this.logger.info('\n--- HTML Content (French) ---');
        console.log(resultFr.htmlContent);
        this.logger.info('\n--- Text Content (French) ---');
        console.log(resultFr.textContent);

        // Test English locale
        this.logger.info('\n\n--- Testing English locale ---');
        const i18nEn = i18nManager.locale('en');
        const resultEn = await emailTemplateService.renderSingleNotification(sampleNotification, i18nEn, 'en');

        this.logger.info(`Subject: ${resultEn.subject}`);
        this.logger.info('\n--- HTML Content (English) ---');
        console.log(resultEn.htmlContent);
        this.logger.info('\n--- Text Content (English) ---');
        console.log(resultEn.textContent);

        // Test digest email
        this.logger.info('\n\n--- Testing Digest Email (French) ---');
        const sampleNotifications = [
            sampleNotification,
            Object.assign(new Notification(), {
                id: 'test-id-2',
                type: NotificationTypeEnum.STATUS_TRANSITION,
                titleKey: 'messages.notifications.status_transition.to_vote.title',
                bodyKey: 'messages.notifications.status_transition.to_vote.message',
                interpolationData: {
                    propositionTitle: 'Proposition validée',
                },
                actionUrl: '/propositions/test-456',
            }),
        ];

        const digestResult = await emailTemplateService.renderDigestNotifications(sampleNotifications, i18nFr, 'fr');

        this.logger.info(`Subject: ${digestResult.subject}`);
        this.logger.info('\n--- HTML Content (Digest) ---');
        console.log(digestResult.htmlContent);
        this.logger.info('\n--- Text Content (Digest) ---');
        console.log(digestResult.textContent);

        this.logger.success('Email template rendering test completed!');
    }
}
