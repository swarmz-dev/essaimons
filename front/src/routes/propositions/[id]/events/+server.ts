import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    const propositionId = params.id?.toString().trim();
    if (!propositionId) {
        return json(
            {
                isSuccess: false,
                message: m['common.error.default-message'](),
            },
            { status: 400 }
        );
    }

    try {
        const payload = await request.json();
        const response = await locals.client.post(`/api/propositions/${encodeURIComponent(propositionId)}/events`, payload);
        return json({ isSuccess: true, data: response.data.event });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? m['common.error.default-message']();
        return json({ isSuccess: false, message }, { status });
    }
};
