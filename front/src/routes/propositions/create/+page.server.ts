import { type Actions, fail, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

export const actions: Actions = {
    default: async (event: RequestEvent): Promise<void> => {
        const { request, locals, cookies } = event;
        const formData: FormData = await request.formData();

        let data: any;
        let isSuccess = true;

        try {
            const response = await locals.client.post('api/propositions', formData);
            data = response.data;
        } catch (error: any) {
            isSuccess = false;
            data = error?.response?.data;
        }

        if (isSuccess) {
            redirect(303, '/', { type: 'success', message: data?.message }, event);
        } else {
            const formDataRecord = extractFormData(formData);

            const form: FormError = {
                data: formDataRecord,
                errors: extractFormErrors(data),
                meta: data?.meta,
            };

            cookies.set('formError', JSON.stringify(form), {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 5,
            });

            fail(400);
        }
    },
};
