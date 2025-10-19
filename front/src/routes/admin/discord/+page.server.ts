import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const { data } = await locals.client.get('api/admin/discord');
        return {
            settings: data?.settings ?? null,
        };
    } catch (error: any) {
        console.error('Failed to load Discord settings:', error);
        return {
            settings: null,
        };
    }
};
