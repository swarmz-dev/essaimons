import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { m } from '#lib/paraglide/messages';

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
    const body = await request.json();
    try {
        const response = await locals.client.post(`/api/admin/user/delete`, {
            users: body.data,
        });

        if (response.status !== 200) {
            throw response;
        }

        return json({
            isSuccess: true,
            messages: response.data.messages,
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
