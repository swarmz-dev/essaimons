import { fail, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { redirect } from 'sveltekit-flash-message/server';
import { extractFormData, extractFormErrors } from '#lib/services/requestService';
import type { FormError } from '../../../app';
import type { SerializedPropositionBootstrap } from 'backend/types';

export const load: PageServerLoad<SerializedPropositionBootstrap> = async ({ locals }) => {
    try {
        const response = await locals.client.get('api/propositions/bootstrap');
        return response.data;
    } catch (error: any) {
        console.error('Failed to load proposition bootstrap data', error?.response?.data ?? error);
        return {
            users: [],
            categories: [],
            propositions: [],
        };
    }
};

export const actions = {
    default: async (event: RequestEvent) => {
        const { request, cookies, locals } = event;
        const formData: FormData = await request.formData();

        const toString = (value: FormDataEntryValue | null): string => (value === null ? '' : value.toString().trim());
        const toArray = (value: FormDataEntryValue | null): string[] => {
            const str = toString(value);
            if (!str) {
                return [];
            }
            return str
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        };
        const toNumericArray = (value: FormDataEntryValue | null): number[] =>
            toArray(value)
                .map((entry) => Number(entry))
                .filter((num) => Number.isFinite(num));

        const jsonPayload = {
            title: toString(formData.get('title')),
            summary: toString(formData.get('summary')),
            detailedDescription: toString(formData.get('detailedDescription')),
            smartObjectives: toString(formData.get('smartObjectives')),
            impacts: toString(formData.get('impacts')),
            mandatesDescription: toString(formData.get('mandatesDescription')),
            expertise: toString(formData.get('expertise')) || null,
            categoryIds: toArray(formData.get('categoryIds')),
            associatedPropositionIds: toArray(formData.get('associatedPropositionIds')),
            rescueInitiatorIds: toNumericArray(formData.get('rescueInitiatorIds')),
            clarificationDeadline: toString(formData.get('clarificationDeadline')),
            improvementDeadline: toString(formData.get('improvementDeadline')),
            voteDeadline: toString(formData.get('voteDeadline')),
            mandateDeadline: toString(formData.get('mandateDeadline')),
            evaluationDeadline: toString(formData.get('evaluationDeadline')),
        };

        console.log('Submitting proposition payload', jsonPayload);

        let data: any;
        let isSuccess = true;

        try {
            const { data: responseData } = await locals.client.post('api/propositions', jsonPayload);
            console.log(responseData);
            data = responseData;
            isSuccess = true;
        } catch (error: any) {
            isSuccess = false;
            const responseData = error?.response?.data ?? { error: error?.message ?? 'Unknown error' };
            console.error('Failed to submit proposition', responseData);
            data = responseData;
        }

        if (isSuccess) {
            redirect(303, '/', { type: 'success', message: data?.message }, event);
        } else {
            const formDataRecord = extractFormData(formData);

            const meta = data?.meta ? { ...data.meta } : {};
            if (data?.details) {
                meta.details = data.details;
            }

            const form: FormError = {
                data: formDataRecord,
                errors: extractFormErrors(data),
                meta: Object.keys(meta).length ? meta : undefined,
            };

            cookies.set('formError', JSON.stringify(form), {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 5,
            });

            return fail<FormError>(400, form);
        }
    },
} satisfies Actions;
