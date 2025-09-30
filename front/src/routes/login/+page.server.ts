import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import type { FormError } from '../../app';
import { extractFormData, extractFormErrors } from '#lib/services/requestService';
import type { Actions, PageServerLoad } from './$types';

export const actions: Actions = {
    default: async (event: RequestEvent) => {
        const { request, cookies, locals } = event;

        const formData: FormData = await request.formData();

        let data: any;
        let isSuccess: boolean = true;

        const bypassLogin: boolean = process.env.TEST_LOGIN_BYPASS === 'true';

        if (bypassLogin) {
            const now: string = new Date().toISOString();
            data = {
                message: 'Connexion réussie (mode test)',
                user: {
                    id: 1,
                    username: (formData.get('identity') ?? 'test-user').toString(),
                    email: 'test@example.com',
                    role: 'user',
                    enabled: true,
                    acceptedTermsAndConditions: true,
                    profilePicture: null,
                    updatedAt: now,
                    createdAt: now,
                },
                token: {
                    token: 'test-token',
                },
            };
        } else {
            try {
                const { data: returnedData } = await locals.client.post('api/auth', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                data = returnedData;
            } catch (error: any) {
                isSuccess = false;
                data = error?.response?.data;
            }
        }

        if (isSuccess) {
            cookies.set('user', JSON.stringify(data.user), {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            cookies.set('token', data.token.token, {
                path: '/',
                httpOnly: false, // Disabled to allow client-side access
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
            const previousPathName: string | undefined = cookies.get('previousPathName');
            cookies.delete('previousPathName', { path: '/' });

            const normalizedPath: string = normalizePath(previousPathName);
            const hasPath: boolean = normalizedPath.length > 0;
            const separator: '?' | '&' = hasPath && normalizedPath.includes('?') ? '&' : '?';
            const location: string = hasPath ? `/${locale}${normalizedPath}${separator}from_login=1` : `/${locale}?from_login=1`;

            return flashRedirect(
                303,
                location,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } else {
            const formDataRecord = extractFormData(formData);
            delete formDataRecord.password;

            const form: FormError = {
                data: formDataRecord,
                errors: extractFormErrors(data),
                meta: data?.meta,
            };

            cookies.set('formError', JSON.stringify(form), {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            return fail<FormError>(400, form);
        }
    },
};

function normalizePath(pathname?: string): string {
    if (!pathname) {
        return '';
    }

    const prefixed = pathname.startsWith('/') ? pathname : `/${pathname}`;

    if (prefixed === '/' || prefixed.startsWith('/login') || prefixed.startsWith('/create-account')) {
        return '';
    }

    return prefixed;
}

export const load: PageServerLoad = async (event): Promise<void> => {
    const data = await event.parent();

    if (data.user) {
        throw redirect(303, `/${data.language}`);
    }
};
