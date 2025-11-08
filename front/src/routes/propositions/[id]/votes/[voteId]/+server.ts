import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';
import type { RequestHandler } from './$types';

const defaultError = (): string => m['common.error.default-message']();

export const PUT: RequestHandler = async ({ params, request, locals }) => {
    const propositionId = params.id?.toString().trim();
    const voteId = params.voteId?.toString().trim();

    if (!propositionId || !voteId) {
        return json({ isSuccess: false, message: defaultError() }, { status: 400 });
    }

    try {
        const payload = await request.json();
        const response = await locals.client.put(`/api/propositions/${encodeURIComponent(propositionId)}/votes/${encodeURIComponent(voteId)}`, payload);
        return json({ isSuccess: true, data: response.data.vote });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? defaultError();
        return json({ isSuccess: false, message }, { status });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    const propositionId = params.id?.toString().trim();
    const voteId = params.voteId?.toString().trim();

    if (!propositionId || !voteId) {
        return json({ isSuccess: false, message: defaultError() }, { status: 400 });
    }

    try {
        await locals.client.delete(`/api/propositions/${encodeURIComponent(propositionId)}/votes/${encodeURIComponent(voteId)}`);
        return json({ isSuccess: true, message: m['proposition-detail.votes.delete.success']() });
    } catch (error: any) {
        const status: number = error?.response?.status ?? 500;
        const message: string = error?.response?.data?.error ?? defaultError();
        return json({ isSuccess: false, message }, { status });
    }
};
