import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';

export const POST: RequestHandler = async ({ params, locals }): Promise<Response> => {
    try {
        const response = await locals.client.post(`/api/block/${params.id}`);

        if (response.status !== 200) {
            throw response;
        }

        return json({
            isSuccess: true,
            message: response.data.message,
        });
    } catch (err: any) {
        return json(
            {
                isSuccess: false,
                message: err?.response?.data?.error || err.message || m['common.error.default-message'](),
            },
            { status: err?.response?.status || 500 }
        );
    }
};
