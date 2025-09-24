import { fail, type RequestEvent, error as svelteError } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';
import { extractFormData, extractFormErrors } from '#lib/services/requestService';
import type { FormError } from '../../../../app';
import type { SerializedProposition, SerializedPropositionBootstrap } from 'backend/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad<{ bootstrap: SerializedPropositionBootstrap; proposition: SerializedProposition }> = async ({ params, locals }) => {
    try {
        const [bootstrapResponse, propositionResponse] = await Promise.all([locals.client.get('api/propositions/bootstrap'), locals.client.get(`api/propositions/${params.id}`)]);

        return {
            bootstrap: bootstrapResponse.data,
            proposition: propositionResponse.data.proposition,
        };
    } catch (error: any) {
        const status: number | undefined = error?.response?.status;
        if (status === 404) {
            throw svelteError(404, 'Proposition not found');
        }

        console.error('Failed to load proposition edit data', error?.response?.data ?? error);
        throw svelteError(status ?? 500, 'Unable to load proposition details');
    }
};

export const actions: Actions = {
    default: async (event: RequestEvent) => {
        const { request, cookies, locals, params } = event;
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
            rescueInitiatorIds: toArray(formData.get('rescueInitiatorIds')),
            clarificationDeadline: toString(formData.get('clarificationDeadline')),
            improvementDeadline: toString(formData.get('improvementDeadline')),
            voteDeadline: toString(formData.get('voteDeadline')),
            mandateDeadline: toString(formData.get('mandateDeadline')),
            evaluationDeadline: toString(formData.get('evaluationDeadline')),
        };

        let data: any;
        let isSuccess = true;

        try {
            const { data: responseData } = await locals.client.put(`api/propositions/${params.id}`, jsonPayload);
            data = responseData;
        } catch (error: any) {
            isSuccess = false;
            data = error?.response?.data ?? { error: error?.message ?? 'Unknown error' };
            console.error('Failed to update proposition', data);
        }

        if (isSuccess) {
            redirect(303, `/propositions/${params.id}`, { type: 'success', message: data?.message }, event);
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
};
