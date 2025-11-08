import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    console.log('[POST /votes] Handler called', { propositionId: params.id });
    const propositionId = params.id?.toString().trim();
    if (!propositionId) {
        console.log('[POST /votes] Invalid proposition ID');
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
        console.log('[POST /votes] Payload received', { title: payload.title, optionsCount: payload.options?.length });
        console.log('[POST /votes] Calling backend API...');
        const response = await locals.client.post(`/api/propositions/${encodeURIComponent(propositionId)}/votes`, payload);
        console.log('[POST /votes] Backend responded successfully');
        return json({ isSuccess: true, data: response.data.vote });
    } catch (error: any) {
        console.error('[POST /votes] Error:', error.message);
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? m['common.error.default-message']();
        return json({ isSuccess: false, message }, { status });
    }
};
