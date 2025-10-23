import { deLocalizeUrl } from '#lib/paraglide/runtime';
import type { RequestEvent } from '@sveltejs/kit';

export const reroute = (request: { url: string }) => deLocalizeUrl(request.url).pathname;
