import { m } from '#lib/paraglide/messages';
import { redirect } from 'sveltekit-flash-message/server';
import type { PageServerLoad } from './$types';
import { type Actions, fail, type RequestEvent } from '@sveltejs/kit';
import type { FormError } from '../../../../../app';
import { extractFormData, extractFormErrors } from '#lib/services/requestService';

export const load: PageServerLoad = async (event) => {
    const { locals, params, cookies } = event;
    try {
        const response = await locals.client.get(`/api/admin/user/${params.id}`);

        if (response.status !== 200) {
            throw response;
        }

        return {
            isSuccess: true,
            user: response.data,
        };
    } catch (error: any) {
        redirect(
            `/${cookies.get('PARAGLIDE_LOCALE')}/admin/user`,
            {
                type: 'error',
                message: error?.response?.data?.error ?? m['common.error.default-message'](),
            },
            event
        );
    }
};

export const actions: Actions = {
    default: async (event: RequestEvent): Promise<void> => {
        const { request, cookies, locals } = event;

        const formData: FormData = await request.formData();
        console.log(formData);

        let data: any;
        let isSuccess: boolean = true;

        try {
            const { data: returnedData } = await locals.client.post('api/admin/user/update', formData, {
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
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } else {
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

            fail(400);
        }
    },
};
