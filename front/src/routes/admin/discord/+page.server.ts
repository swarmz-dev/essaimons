import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';

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

export const actions: Actions = {
    default: async (event) => {
        const { request, locals, cookies } = event;
        const formData = await request.formData();

        const payload = {
            enabled: formData.get('enabled') === 'true',
            botToken: formData.get('botToken')?.toString() || '',
            guildId: formData.get('guildId')?.toString() || '',
            defaultChannelId: formData.get('defaultChannelId')?.toString() || '',
        };

        try {
            const { data } = await locals.client.post('api/admin/discord', payload);

            const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
            throw flashRedirect(
                303,
                `/${locale}/admin/discord`,
                {
                    type: 'success',
                    message: data?.message ?? 'Discord settings updated successfully',
                },
                event
            );
        } catch (error: any) {
            if (error?.status && error?.location) {
                throw error;
            }

            return fail(400, {
                error: error?.response?.data?.error ?? 'Failed to update Discord settings',
            });
        }
    },
};
