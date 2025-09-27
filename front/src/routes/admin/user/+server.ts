import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { m } from '#lib/paraglide/messages';

export const GET: RequestHandler = async ({ url, locals }): Promise<Response> => {
    try {
        const page: number = Number(url.searchParams.get('page')) || 1;
        const limit: number = Number(url.searchParams.get('limit')) || 10;
        const query: string = url.searchParams.get('query') || '';
        const sortBy: string = url.searchParams.get('sortBy') || 'email:asc';

        const response = await locals.client.get('/api/admin/user', {
            params: { page, limit, query, sortBy },
        });

        if (response.status !== 200) {
            throw response;
        }

        return json({
            isSuccess: true,
            data: response.data,
        });
    } catch (error: any) {
        return json(
            {
                isSuccess: false,
                message: error?.response?.data?.error || m['common.error.default-message'](),
            },
            { status: error?.response?.status || 500 }
        );
    }
};
