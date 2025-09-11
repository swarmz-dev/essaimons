import type { RequestHandler } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';

export const GET: RequestHandler = async ({ params, url, locals }): Promise<Response> => {
    const noCache: boolean = url.searchParams.get('no-cache') === 'true';

    try {
        const response = await locals.client.get(`/api/static/${params.assetPath}`, {
            responseType: 'arraybuffer',
        });

        if (response.status !== 200) {
            throw response;
        }

        return new Response(response.data, {
            headers: {
                'Content-Type': response.headers['content-type'] || 'application/octet-stream',
                'Content-Disposition': response.headers['content-disposition'] || 'inline',
                'Cache-Control': noCache ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
            },
        });
    } catch (error: any) {
        return new Response(
            JSON.stringify({
                isSuccess: false,
                message: error?.response?.data?.error ?? m['common.error.default-message'](),
            }),
            {
                status: error?.response?.status ?? 400,
            }
        );
    }
};
