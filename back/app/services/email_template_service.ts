import { inject } from '@adonisjs/core';
import EmailTemplate from '#models/email_template';
import Notification from '#models/notification';
import { I18n } from '@adonisjs/i18n';
import env from '#start/env';

/**
 * Service for rendering email templates with i18n support and variable interpolation
 */
@inject()
export default class EmailTemplateService {
    /**
     * Render a single notification email
     */
    async renderSingleNotification(notification: Notification, i18n: I18n, locale: string = 'fr'): Promise<{ subject: string; htmlContent: string; textContent: string }> {
        const template = await EmailTemplate.query().where('key', 'notification_single').where('is_active', true).first();

        if (!template) {
            throw new Error('Email template "notification_single" not found or inactive');
        }

        // Translate notification title and message
        const translatedTitle = i18n.t(notification.titleKey, notification.interpolationData || {});
        const translatedMessage = i18n.t(notification.bodyKey, notification.interpolationData || {});

        // Template variables
        const variables = {
            organizationName: env.get('APP_NAME', 'Essaimons V1'),
            baseUrl: env.get('PUBLIC_APP_URI'),
            title: translatedTitle,
            message: translatedMessage,
            actionUrl: notification.actionUrl || null,
        };

        // Render subject
        const subject = this.interpolate(template.subjects[locale] || template.subjects.en, variables);

        // Render HTML content
        const htmlContent = this.interpolate(template.htmlContents[locale] || template.htmlContents.en, variables);

        // Render text content
        const textContent = this.interpolate((template.textContents && (template.textContents[locale] || template.textContents.en)) || '', variables);

        return {
            subject,
            htmlContent,
            textContent,
        };
    }

    /**
     * Render a digest email with multiple notifications
     */
    async renderDigestNotifications(notifications: Notification[], i18n: I18n, locale: string = 'fr'): Promise<{ subject: string; htmlContent: string; textContent: string }> {
        const template = await EmailTemplate.query().where('key', 'notification_digest').where('is_active', true).first();

        if (!template) {
            throw new Error('Email template "notification_digest" not found or inactive');
        }

        // Translate all notifications
        const translatedNotifications = notifications.map((n) => ({
            title: i18n.t(n.titleKey, n.interpolationData || {}),
            message: i18n.t(n.bodyKey, n.interpolationData || {}),
            actionUrl: n.actionUrl || null,
        }));

        // Template variables
        const variables = {
            organizationName: env.get('APP_NAME', 'Essaimons V1'),
            baseUrl: env.get('PUBLIC_APP_URI'),
            count: notifications.length,
            notifications: translatedNotifications,
        };

        // Render subject
        const subject = this.interpolate(template.subjects[locale] || template.subjects.en, variables);

        // Render HTML content with Handlebars-style syntax
        const htmlContent = this.interpolateHandlebars(template.htmlContents[locale] || template.htmlContents.en, variables);

        // Render text content with Handlebars-style syntax
        const textContent = this.interpolateHandlebars((template.textContents && (template.textContents[locale] || template.textContents.en)) || '', variables);

        return {
            subject,
            htmlContent,
            textContent,
        };
    }

    /**
     * Simple variable interpolation for {{variable}} syntax
     */
    private interpolate(template: string, variables: Record<string, any>): string {
        let result = template;

        for (const [key, value] of Object.entries(variables)) {
            // Skip complex objects (arrays, objects)
            if (typeof value === 'object' && value !== null) {
                continue;
            }

            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value !== null && value !== undefined ? String(value) : '');
        }

        // Handle {{#if}} conditionals (simple implementation)
        result = this.processConditionals(result, variables);

        return result;
    }

    /**
     * Handlebars-style interpolation for {{#each}} and {{#if}} blocks
     */
    private interpolateHandlebars(template: string, variables: Record<string, any>): string {
        let result = template;

        // Process {{#each}} blocks
        result = this.processEachBlocks(result, variables);

        // Process {{#if}} blocks
        result = this.processConditionals(result, variables);

        // Process simple variables
        result = this.interpolate(result, variables);

        return result;
    }

    /**
     * Process {{#each array}} blocks
     */
    private processEachBlocks(template: string, variables: Record<string, any>): string {
        const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
        let result = template;

        result = result.replace(eachRegex, (_match, arrayName, blockContent) => {
            const array = variables[arrayName];

            if (!Array.isArray(array)) {
                return '';
            }

            return array
                .map((item) => {
                    let itemContent = blockContent;

                    // Replace {{this.property}} with item values
                    for (const [key, value] of Object.entries(item)) {
                        const thisRegex = new RegExp(`{{this\\.${key}}}`, 'g');
                        itemContent = itemContent.replace(thisRegex, value !== null && value !== undefined ? String(value) : '');
                    }

                    // Handle {{#if this.property}} within each block
                    itemContent = this.processThisConditionals(itemContent, item);

                    // Handle {{../variable}} for parent scope
                    for (const [key, value] of Object.entries(variables)) {
                        if (typeof value === 'object' && value !== null) {
                            continue;
                        }
                        const parentRegex = new RegExp(`{{\\.\\.\/${key}}}`, 'g');
                        itemContent = itemContent.replace(parentRegex, value !== null && value !== undefined ? String(value) : '');
                    }

                    return itemContent;
                })
                .join('');
        });

        return result;
    }

    /**
     * Process {{#if variable}} conditionals
     */
    private processConditionals(template: string, variables: Record<string, any>): string {
        const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        let result = template;

        result = result.replace(ifRegex, (_match, variableName, blockContent) => {
            const value = variables[variableName];

            // Check if value is truthy
            if (value !== null && value !== undefined && value !== false && value !== '' && value !== 0) {
                return blockContent;
            }

            return '';
        });

        return result;
    }

    /**
     * Process {{#if this.property}} conditionals within each blocks
     */
    private processThisConditionals(template: string, context: Record<string, any>): string {
        const ifRegex = /{{#if\s+this\.(\w+)}}([\s\S]*?){{\/if}}/g;
        let result = template;

        result = result.replace(ifRegex, (_match, propertyName, blockContent) => {
            const value = context[propertyName];

            // Check if value is truthy
            if (value !== null && value !== undefined && value !== false && value !== '' && value !== 0) {
                return blockContent;
            }

            return '';
        });

        return result;
    }
}
