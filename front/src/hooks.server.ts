import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '#lib/paraglide/server';
import { getClient } from '#lib/api.server';
import type { LanguageCode } from '#lib/stores/languageStore';

const handleParaglide: Handle = ({ event, resolve }) => {
    // For methods with body (POST, PUT, PATCH, DELETE), skip paraglide middleware
    // to avoid body consumption issues. The locale will be handled by cookies instead.
    if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
        return resolve(event, {
            transformPageChunk: ({ html }): string => html.replace('%paraglide.lang%', event.cookies.get('PARAGLIDE_LOCALE') ?? 'fr'),
        });
    }

    return paraglideMiddleware(event.request, ({ request, locale }) => {
        event.request = request;

        return resolve(event, {
            transformPageChunk: ({ html }): string => html.replace('%paraglide.lang%', locale),
        });
    });
};

export const handleClientAuth: Handle = async ({ event, resolve }) => {
    const token: string | undefined = event.cookies.get('token');
    const language = event.cookies.get('PARAGLIDE_LOCALE') as LanguageCode | undefined;

    event.locals.client = getClient(token, language);
    return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
    const MAX_BODY_SIZE = 300_000_000;
    const contentLength: string | null = event.request.headers.get('content-length');

    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
        return new Response('Payload too large', { status: 413 });
    }

    return handleClientAuth({
        event,
        resolve: (e) => handleParaglide({ event: e, resolve }),
    });
};
