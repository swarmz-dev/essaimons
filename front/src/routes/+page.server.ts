import type { PageServerLoad } from './$types';
import type { PaginatedPropositions } from 'backend/types';

type HomePageResponse = {
    voting: PaginatedPropositions;
    mandate: PaginatedPropositions;
    recent: PaginatedPropositions;
    user: PaginatedPropositions | null;
};

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const { data } = await locals.client.get<HomePageResponse>('api/propositions/home');
        return data;
    } catch (error: any) {
        console.error('Failed to load home page data', error?.response?.data ?? error);

        return {
            voting: { propositions: [], firstPage: 1, lastPage: 1, limit: 10, total: 0, currentPage: 1 },
            mandate: { propositions: [], firstPage: 1, lastPage: 1, limit: 10, total: 0, currentPage: 1 },
            recent: { propositions: [], firstPage: 1, lastPage: 1, limit: 10, total: 0, currentPage: 1 },
            user: null,
        };
    }
};
