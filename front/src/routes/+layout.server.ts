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

        // Load organization settings early to get defaultLocale
        let defaultLocale = 'fr'; // Fallback if API call fails
        let fallbackLocale = 'en';

        try {
            const { data } = await locals.client.get<{ settings: SerializedOrganizationSettings }>('api/settings/organization');
            if (data?.settings) {
                defaultLocale = data.settings.defaultLocale || data.settings.fallbackLocale || 'fr';
                fallbackLocale = data.settings.fallbackLocale || 'en';
            }
        } catch (error: any) {
            // Silently fail, use defaults
            console.error('load.organization.early-fetch.error', error?.response?.data ?? error);
        }

        const match: RegExpMatchArray | null = url.pathname.match(/^\/([a-z]{2})(\/|$)/);
        const language: LanguageCode | undefined = match ? (match[1] as LanguageCode) : undefined;

        if (!language || !locales.includes(language)) {
            // Try to detect browser language if no cookie is set
            let detectedLanguage = cookies.get('PARAGLIDE_LOCALE');

            if (!detectedLanguage) {
                // Try to get browser's preferred language from Accept-Language header
                const acceptLanguage = event.request.headers.get('accept-language');
                if (acceptLanguage) {
                    // Parse language preferences
                    const languages = acceptLanguage
                        .split(',')
                        .map((lang) => {
                            const [tag, q = '1'] = lang.trim().split(';q=');
                            const baseTag = tag?.split('-')[0]?.toLowerCase();
                            return {
                                fullTag: tag?.toLowerCase(),
                                baseTag,
                                q: Number(q),
                            };
                        })
                        .sort((a, b) => b.q - a.q);

                    // Find first matching locale
                    for (const lang of languages) {
                        if (locales.includes(lang.fullTag as LanguageCode)) {
                            detectedLanguage = lang.fullTag;
                            break;
                        } else if (locales.includes(lang.baseTag as LanguageCode)) {
                            detectedLanguage = lang.baseTag;
                            break;
                        }
                    }
                }

                // If no browser language detected, use defaultLocale from organization settings
                if (!detectedLanguage) {
                    detectedLanguage = defaultLocale;
                }
            }

            return redirect(307, `/${detectedLanguage}${url.pathname}${url.search}`);
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
            defaultLocale: 'fr',
            fallbackLocale: 'en',
            locales: [],
            name: {},
            description: {},
            sourceCodeUrl: {},
            copyright: {},
            logo: null,
            propositionDefaults: {
                clarificationOffsetDays: 7,
                amendmentOffsetDays: 15,
                voteOffsetDays: 7,
                mandateOffsetDays: 15,
                evaluationOffsetDays: 30,
            },
            permissions: { perStatus: {} },
            permissionCatalog: { perStatus: {} },
            workflowAutomation: {
                deliverableRecalcCooldownMinutes: 10,
                evaluationAutoShiftDays: 14,
                nonConformityPercentThreshold: 10,
                nonConformityAbsoluteFloor: 5,
                revocationAutoTriggerDelayDays: 7,
                revocationCheckFrequencyHours: 24,
                deliverableNamingPattern: 'DELIV-{proposition}-{date}',
            },
        };

        try {
            const { data } = await locals.client.get<{ settings: SerializedOrganizationSettings }>('api/settings/organization');
            if (data?.settings) {
                organization = {
                    ...organization,
                    ...data.settings,
                    permissions: data.settings.permissions ?? organization.permissions,
                    permissionCatalog: data.settings.permissionCatalog ?? organization.permissionCatalog,
                    workflowAutomation: data.settings.workflowAutomation ?? organization.workflowAutomation,
                };
            }
        } catch (error: any) {
            console.error('load.organization.fetch.error', error?.response?.data ?? error);
        }

        const location: string = url.pathname.replace(new RegExp(`^/${language}`), '') || '/';

        const formError: string | undefined = cookies.get('formError');

        if (!userCookie) {
            cookies.delete('token', { path: '/' });
            cookies.delete('client_token', { path: '/' });
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
                    cookies.delete('client_token', { path: '/' });
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
