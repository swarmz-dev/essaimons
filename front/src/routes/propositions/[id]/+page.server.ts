import { error, fail } from '@sveltejs/kit';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import type { SerializedProposition } from 'backend/types';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
    delete: async (event) => {
        const { locals, params, cookies } = event;

        const propositionId = params.id?.toString().trim();

        if (!propositionId) {
            const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
            throw flashRedirect(
                303,
                `/${locale}/propositions`,
                {
                    type: 'error',
                    message: 'Invalid proposition identifier',
                },
                event
            );
        }

        try {
            const { data } = await locals.client.delete<{ message?: string }>(`api/propositions/${propositionId}`);
            const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';

            throw flashRedirect(
                303,
                `/${locale}/propositions`,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } catch (err: any) {
            if (err?.status && err?.location) {
                throw err;
            }
            const status: number | undefined = err?.response?.status;
            const message: string | undefined = err?.response?.data?.error;
            const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';

            if (status === 404) {
                throw flashRedirect(
                    303,
                    `/${locale}/propositions`,
                    {
                        type: 'error',
                        message: message ?? 'Proposition not found',
                    },
                    event
                );
            }

            throw flashRedirect(
                303,
                `/${locale}/propositions`,
                {
                    type: 'error',
                    message: message ?? 'Unable to delete proposition',
                },
                event
            );
        }
    },
};
