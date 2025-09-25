import type { Actions, PageServerLoad } from './$types';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';
import type { SerializedPropositionCategory } from 'backend/types';

const extractErrorMessage = (error: any, fallback: string): string => {
    const apiError: unknown = error?.response?.data;

    if (apiError && typeof apiError === 'object') {
        const errorMessage = (apiError as { error?: string }).error;
        if (errorMessage && typeof errorMessage === 'string') {
            return errorMessage;
        }

        const errors = (apiError as { errors?: Array<{ message?: string }> }).errors;
        if (Array.isArray(errors) && errors.length) {
            const firstMessage = errors.find((item) => typeof item.message === 'string')?.message;
            if (firstMessage) {
                return firstMessage;
            }
        }
    }

    return fallback;
};

export const load: PageServerLoad<{ categories: SerializedPropositionCategory[] }> = async ({ locals }) => {
    try {
        const { data } = await locals.client.get<{ categories: SerializedPropositionCategory[] }>('api/admin/categories');

        return {
            categories: data.categories ?? [],
        };
    } catch (error: any) {
        console.error('Failed to load categories', error?.response?.data ?? error);

        return {
            categories: [],
        };
    }
};

export const actions: Actions = {
    create: async (event) => {
        const { request, locals, cookies } = event;
        const formData = await request.formData();
        const name = formData.get('name');
        const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
        const redirectTo = `/${locale}/admin/categories`;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message: 'Category name is required',
                },
                event
            );
        }

        try {
            const { data } = await locals.client.post<{ message?: string; category: SerializedPropositionCategory }>('api/admin/categories', {
                name: name.trim(),
            });

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } catch (error: any) {
            if (error?.status && error?.location) {
                throw error;
            }

            const message = extractErrorMessage(error, 'Unable to create category');

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message,
                },
                event
            );
        }
    },
    update: async (event) => {
        const { request, locals, cookies } = event;
        const formData = await request.formData();
        const id = formData.get('id');
        const name = formData.get('name');
        const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
        const redirectTo = `/${locale}/admin/categories`;

        if (!id || typeof id !== 'string') {
            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message: 'Invalid category identifier',
                },
                event
            );
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message: 'Category name is required',
                },
                event
            );
        }

        try {
            const { data } = await locals.client.put<{ message?: string; category: SerializedPropositionCategory }>(`api/admin/categories/${encodeURIComponent(id)}`, {
                name: name.trim(),
            });

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } catch (error: any) {
            if (error?.status && error?.location) {
                throw error;
            }

            const message = extractErrorMessage(error, 'Unable to update category');

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message,
                },
                event
            );
        }
    },
    delete: async (event) => {
        const { request, locals, cookies } = event;
        const formData = await request.formData();
        const id = formData.get('id');
        const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
        const redirectTo = `/${locale}/admin/categories`;

        if (!id || typeof id !== 'string') {
            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message: 'Invalid category identifier',
                },
                event
            );
        }

        try {
            const { data } = await locals.client.delete<{ message?: string }>(`api/admin/categories/${encodeURIComponent(id)}`);

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'success',
                    message: data?.message,
                },
                event
            );
        } catch (error: any) {
            if (error?.status && error?.location) {
                throw error;
            }

            const message = extractErrorMessage(error, 'Unable to delete category');

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'error',
                    message,
                },
                event
            );
        }
    },
};
