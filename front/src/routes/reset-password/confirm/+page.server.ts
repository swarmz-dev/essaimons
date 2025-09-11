import { type Actions, type RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';
import type { FormError, PageDataError } from '../../../app';
import { extractFormData, extractFormErrors } from '#lib/services/requestService';

export const actions: Actions = {
    default: async (event: RequestEvent): Promise<void> => {
        const { url, request, cookies, locals } = event;
        const token: string | null = url.searchParams.get('token');

        const formData: FormData = await request.formData();

        let data: any;
        let isSuccess: boolean = true;

        try {
            formData.append('confirmPassword', <string>formData.get('confirm-password'));
            formData.delete('confirm-password');
            const { data: returnedData } = await locals.client.post(`api/reset-password/confirm/${token}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            data = returnedData;
        } catch (error: any) {
            isSuccess = false;
            data = error?.response?.data;
        }

        if (isSuccess) {
            redirect(
                `${cookies.get('user') ? `/${cookies.get('PARAGLIDE_LOCALE')}` : `/${cookies.get('PARAGLIDE_LOCALE')}/login`}`,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } else {
            const errors: PageDataError[] = extractFormErrors(data);
            const form: FormError = {
                data: extractFormData(formData),
                errors: extractFormErrors(data),
            };

            cookies.set('formError', JSON.stringify(form), {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            redirect(`/${cookies.get('PARAGLIDE_LOCALE')}/login`, errors[0], event);
        }
    },
};
