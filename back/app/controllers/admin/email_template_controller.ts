import type { HttpContext } from '@adonisjs/core/http';
import { inject } from '@adonisjs/core';
import EmailTemplate from '#models/email_template';
import { createEmailTemplateValidator, updateEmailTemplateValidator, getEmailTemplateValidator } from '#validators/admin/email_template';

@inject()
export default class EmailTemplateController {
    /**
     * Get all email templates
     */
    public async index({ response }: HttpContext) {
        const templates = await EmailTemplate.query().orderBy('name', 'asc');

        return response.ok({
            data: {
                templates: templates.map((t) => t.apiSerialize()),
            },
        });
    }

    /**
     * Get a single email template
     */
    public async show({ request, response }: HttpContext) {
        const { id } = await getEmailTemplateValidator.validate(request.params());
        const template = await EmailTemplate.findOrFail(id);

        return response.ok({
            data: {
                template: template.apiSerialize(),
            },
        });
    }

    /**
     * Create a new email template
     */
    public async store({ request, response, i18n }: HttpContext) {
        const payload = await request.validateUsing(createEmailTemplateValidator);

        const template = await EmailTemplate.create(payload);

        return response.created({
            data: {
                template: template.apiSerialize(),
            },
            message: i18n.t('messages.admin.email_template.create.success'),
        });
    }

    /**
     * Update an email template
     */
    public async update({ request, response, i18n }: HttpContext) {
        const { id } = await getEmailTemplateValidator.validate(request.params());
        const payload = await request.validateUsing(updateEmailTemplateValidator);

        const template = await EmailTemplate.findOrFail(id);
        template.merge(payload);
        await template.save();

        return response.ok({
            data: {
                template: template.apiSerialize(),
            },
            message: i18n.t('messages.admin.email_template.update.success'),
        });
    }

    /**
     * Delete an email template
     */
    public async destroy({ request, response, i18n }: HttpContext) {
        const { id } = await getEmailTemplateValidator.validate(request.params());
        const template = await EmailTemplate.findOrFail(id);

        await template.delete();

        return response.ok({
            message: i18n.t('messages.admin.email_template.delete.success'),
        });
    }
}
