import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';
import type { RequestHandler } from './$types';

const fallbackMessage = (): string => m['common.error.default-message']();

export const PUT: RequestHandler = async ({ params, request, locals }) => {
    const propositionId = params.id?.toString().trim();
    const commentId = params.commentId?.toString().trim();

    if (!propositionId || !commentId) {
        return json({ isSuccess: false, message: fallbackMessage() }, { status: 400 });
    }

    try {
        const payload = await request.json();
        const response = await locals.client.put(`/api/propositions/${encodeURIComponent(propositionId)}/comments/${encodeURIComponent(commentId)}`, payload);
        return json({ isSuccess: true, data: response.data.comment });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? fallbackMessage();
        return json({ isSuccess: false, message }, { status });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    const propositionId = params.id?.toString().trim();
    const commentId = params.commentId?.toString().trim();

    if (!propositionId || !commentId) {
        return json({ isSuccess: false, message: fallbackMessage() }, { status: 400 });
    }

    try {
        const response = await locals.client.delete(`/api/propositions/${encodeURIComponent(propositionId)}/comments/${encodeURIComponent(commentId)}`);
        return json({ isSuccess: true, data: response.data });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? fallbackMessage();
        return json({ isSuccess: false, message }, { status });
    }
};
