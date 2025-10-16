import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const response = await locals.client.get('/api/notifications', {
            params: {
                page: 1,
                limit: 50,
            },
        });

        const meta = response.data.meta || {};

        return {
            notifications: response.data.notifications || [],
            pagination: {
                page: meta.currentPage || 1,
                limit: meta.perPage || 50,
                total: meta.total || 0,
            },
        };
    } catch (error: any) {
        console.error('Failed to load notifications:', error);
        return {
            notifications: [],
            pagination: {
                page: 1,
                limit: 50,
                total: 0,
            },
        };
    }
};
