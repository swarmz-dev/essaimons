import { error } from '@sveltejs/kit';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import type { AxiosResponse } from 'axios';
import type { SerializedProposition } from 'backend/types';
import type { PropositionComment, PropositionEvent, PropositionMandate, PropositionVote } from '#lib/types/proposition';
import type { Actions, PageServerLoad } from './$types';

type PropositionDetailPageData = {
    proposition: SerializedProposition;
    events: PropositionEvent[];
    votes: PropositionVote[];
    mandates: PropositionMandate[];
    comments: PropositionComment[];
};

export const load: PageServerLoad<PropositionDetailPageData> = async ({ params, locals }) => {
    const propositionId = params.id?.toString().trim();

    if (!propositionId) {
        throw error(404, 'Invalid proposition identifier');
    }

    try {
        const { data: propositionPayload } = await locals.client.get<{ proposition: SerializedProposition }>(`api/propositions/${propositionId}`);

        const [eventsResult, votesResult, mandatesResult, commentsResult] = await Promise.allSettled([
            locals.client.get<{ events: PropositionEvent[] }>(`api/propositions/${propositionId}/events`),
            locals.client.get<{ votes: PropositionVote[] }>(`api/propositions/${propositionId}/votes`),
            locals.client.get<{ mandates: PropositionMandate[] }>(`api/propositions/${propositionId}/mandates`),
            locals.client.get<{ comments: PropositionComment[] }>(`api/propositions/${propositionId}/comments`),
        ]);

        const extract = <T>(result: PromiseSettledResult<AxiosResponse<T>>, fallback: T): T => {
            if (result.status === 'fulfilled') {
                return result.value.data ?? fallback;
            }
            console.error('proposition.detail.partial.fetch.error', result.reason);
            return fallback;
        };

        const eventsPayload = extract(eventsResult, { events: [] });
        const votesPayload = extract(votesResult, { votes: [] });
        const mandatesPayload = extract(mandatesResult, { mandates: [] });
        const commentsPayload = extract(commentsResult, { comments: [] });

        return {
            proposition: propositionPayload.proposition,
            events: eventsPayload.events ?? [],
            votes: votesPayload.votes ?? [],
            mandates: mandatesPayload.mandates ?? [],
            comments: commentsPayload.comments ?? [],
        } satisfies PropositionDetailPageData;
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
