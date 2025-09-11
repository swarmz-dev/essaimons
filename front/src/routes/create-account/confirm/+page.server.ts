import { loadFlash, redirect } from 'sveltekit-flash-message/server';
import type { PageServerLoad } from './$types';
import { m } from '#lib/paraglide/messages';

export const load: PageServerLoad = loadFlash(async (event): Promise<never> => {
    const { url, cookies, locals } = event;
    const token: string | null = url.searchParams.get('token');

    let data: any;
    let isSuccess: boolean = true;

    try {
        const { data: returnedData } = await locals.client.post(`api/account-creation/confirm/${token}`);
        data = returnedData;
    } catch (error: any) {
        isSuccess = false;
        data = error?.response?.data;
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
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
        });

        redirect(
            303,
            `/${cookies.get('PARAGLIDE_LOCALE')}`,
            {
                type: 'success',
                message: data?.message,
            },
            event
        );
    } else {
        redirect(
            `/${cookies.get('PARAGLIDE_LOCALE')}/create-account`,
            {
                type: 'error',
                message: data?.error ?? m['common.error.default-message'](),
            },
            event
        );
    }
});
