import { loadFlash, redirect } from 'sveltekit-flash-message/server';
import type { LayoutServerLoad } from './$types';
import type { SerializedUser, SerializedOrganizationSettings } from 'backend/types';
import { type LanguageCode } from '#lib/stores/languageStore';
import { locales } from '#lib/paraglide/runtime';
import type { FormError } from '../app';

interface OpenedPathName {
    pathname: string;
    hybrid: boolean;
}

export const load: LayoutServerLoad = loadFlash(
    async (event): Promise<{ user?: SerializedUser; language: LanguageCode; location: string; organization: SerializedOrganizationSettings; formError?: FormError }> => {
        const { cookies, url, locals } = event;

        // Paths that don't require authentication
        const openedPathNames: OpenedPathName[] = [
            { pathname: '/create-account', hybrid: false },
            { pathname: '/login', hybrid: false },
            { pathname: '/oauth', hybrid: false },
            { pathname: '/reset-password', hybrid: true },
        ];

        const match: RegExpMatchArray | null = url.pathname.match(/^\/([a-z]{2})(\/|$)/);
        const language: LanguageCode | undefined = match ? (match[1] as LanguageCode) : undefined;

        if (!language || !locales.includes(language)) {
            return redirect(307, `/${cookies.get('PARAGLIDE_LOCALE') ?? 'fr'}${url.pathname}${url.search}`);
        }

        if (language !== cookies.get('PARAGLIDE_LOCALE')) {
            cookies.set('PARAGLIDE_LOCALE', language, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365,
            });
        }

        const userCookie: string | undefined = cookies.get('user');
        const user: SerializedUser | undefined = userCookie ? <SerializedUser>JSON.parse(userCookie) : undefined;

        let organization: SerializedOrganizationSettings = {
            fallbackLocale: 'en',
            locales: [],
            name: {},
            description: {},
            sourceCodeUrl: {},
            copyright: {},
            logo: null,
        };

        try {
            const { data } = await locals.client.get<{ settings: SerializedOrganizationSettings }>('api/settings/organization');
            organization = data.settings ?? organization;
        } catch (error: any) {
            console.error('load.organization.fetch.error', error?.response?.data ?? error);
        }

        const location: string = url.pathname.replace(new RegExp(`^/${language}`), '') || '/';

        const formError: string | undefined = cookies.get('formError');

        if (!userCookie) {
            cookies.delete('token', { path: '/' });
            if (openedPathNames.some((openedPathName: OpenedPathName): boolean => location.startsWith(openedPathName.pathname))) {
                if (formError) {
                    cookies.delete('formError', { path: '/' });

                    return {
                        language,
                        location,
                        organization,
                        formError: JSON.parse(formError),
                    };
                }

                return { language, location, organization };
            }

            cookies.set('previousPathName', `${location}${url.search}`, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60,
            });

            return redirect(303, `/${language}/login`);
        }

        const bypassLogin = process.env.TEST_LOGIN_BYPASS === 'true';

        if (!cookies.get('token') && !bypassLogin) {
            cookies.delete('user', { path: '/' });
            cookies.set('previousPathName', `${location}${url.search}`, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60,
            });

            return redirect(303, `/${language}/login`);
        }

        if (!bypassLogin) {
            // Revalidate the authenticated session at least once per hour
            const lastAuthCheckCookie = cookies.get('authValidatedAt');
            const lastAuthCheckTimestamp: number | undefined = lastAuthCheckCookie ? Number(lastAuthCheckCookie) : undefined;
            const isAuthCheckExpired = !lastAuthCheckTimestamp || Number.isNaN(lastAuthCheckTimestamp) || Date.now() - lastAuthCheckTimestamp >= 60 * 60 * 1000;

            if (isAuthCheckExpired) {
                try {
                    await locals.client.get('api');
                    cookies.set('authValidatedAt', Date.now().toString(), {
                        path: '/',
                        httpOnly: true,
                        sameSite: 'lax',
                        maxAge: 60 * 60 * 24 * 7,
                    });
                } catch (error) {
                    cookies.delete('user', { path: '/' });
                    cookies.delete('token', { path: '/' });
                    cookies.delete('authValidatedAt', { path: '/' });
                    cookies.set('previousPathName', `${location}${url.search}`, {
                        path: '/',
                        httpOnly: false,
                        sameSite: 'lax',
                        maxAge: 60 * 60,
                    });

                    return redirect(303, `/${language}/login`);
                }
            }
        }

        if (!url.searchParams.has('from_login') && openedPathNames.some((openedPathName: OpenedPathName): boolean => location.startsWith(openedPathName.pathname) && !openedPathName.hybrid)) {
            const redirectTo = cookies.get('previousPathName') ?? '/';
            cookies.delete('previousPathName', { path: '/' });
            return redirect(303, `/${language}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`);
        }

        cookies.delete('previousPathName', { path: '/' });

        if (formError) {
            cookies.delete('formError', { path: '/' });

            return {
                user,
                language,
                location,
                organization,
                formError: JSON.parse(formError),
            };
        }

        return {
            user,
            language,
            location,
            organization,
        };
    }
);
