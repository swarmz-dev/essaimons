import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '#lib/paraglide/server';
import { getClient } from '#lib/api.server';
import type { LanguageCode } from '#lib/stores/languageStore';

const handleParaglide: Handle = ({ event, resolve }): Promise<Response> =>
    paraglideMiddleware(event.request, ({ request, locale }) => {
        event.request = request;

        return resolve(event, {
            transformPageChunk: ({ html }): string => html.replace('%paraglide.lang%', locale),
        });
    });

export const handleClientAuth: Handle = async ({ event, resolve }) => {
    const token: string | undefined = event.cookies.get('token');
    const language = event.cookies.get('PARAGLIDE_LOCALE') as LanguageCode | undefined;

    event.locals.client = getClient(token, language);
    return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
    // Enchaîne manuellement les middlewares dans l'ordre
    return handleClientAuth({
        event,
        resolve: (e) => handleParaglide({ event: e, resolve }),
    });
};
