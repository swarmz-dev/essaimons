import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';

export const POST: RequestHandler = async ({ params, locals }): Promise<Response> => {
    try {
        const response = await locals.client.delete(`/api/friends/pending/refuse/${params.id}`);

        if (response.status !== 200) {
            throw response;
        }

        return json({
            isSuccess: true,
            message: response.data.message,
        });
    } catch (error: any) {
        return json(
            {
                isSuccess: false,
                message: error?.response?.data?.error || error.message || m['common.error.default-message'](),
            },
            { status: error?.response?.status || 500 }
        );
    }
};
