import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { m } from '#lib/paraglide/messages';

export const GET: RequestHandler = async ({ url, locals }): Promise<Response> => {
    try {
        const page: number = Number(url.searchParams.get('page')) || 1;
        const limit: number = Number(url.searchParams.get('limit')) || 10;
        const query: string = url.searchParams.get('query') || '';

        const response = await locals.client.get('/api/friends/add', {
            params: { page, limit, query },
        });

        if (response.status !== 200) {
            throw response;
        }

        return json({
            isSuccess: true,
            message: response.data.message,
            users: response.data.users,
        });
    } catch (err: any) {
        return json(
            {
                isSuccess: false,
                message: err?.response?.data?.error || m['common.error.default-message'](),
            },
            { status: err?.response?.status || 500 }
        );
    }
};
