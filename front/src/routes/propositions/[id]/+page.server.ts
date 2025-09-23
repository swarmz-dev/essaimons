import { error } from '@sveltejs/kit';
import type { SerializedProposition } from 'backend/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad<{ proposition: SerializedProposition }> = async ({ params, locals }) => {
    const propositionId = params.id?.toString().trim();

    if (!propositionId) {
        throw error(404, 'Invalid proposition identifier');
    }

    try {
        const response = await locals.client.get<{ proposition: SerializedProposition }>(`api/propositions/${propositionId}`);
        return {
            proposition: response.data.proposition,
        };
    } catch (err: any) {
        const status: number | undefined = err?.response?.status;
        const message: string | undefined = err?.response?.data?.error;

        if (status === 404) {
            throw error(404, message ?? 'Proposition not found');
        }

        console.error('Failed to load proposition detail', err?.response?.data ?? err);
        throw error(500, 'Unable to load proposition detail');
    }
};
