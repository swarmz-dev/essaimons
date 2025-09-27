import type { Actions, PageServerLoad } from './$types';
import type { SerializedOrganizationSettings } from 'backend/types';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';

const toBoolean = (value: FormDataEntryValue | null): boolean => {
    if (!value) return false;
    const normalized = value.toString().toLowerCase();
    return normalized === 'true' || normalized === 'on' || normalized === '1';
};

export const load: PageServerLoad<{ settings: SerializedOrganizationSettings }> = async ({ locals }) => {
    try {
        const { data } = await locals.client.get<{ settings: SerializedOrganizationSettings }>('api/admin/organization');

        return {
            settings: data.settings,
        };
    } catch (error: any) {
        console.error('admin.organization.load.error', error?.response?.data ?? error);
        return {
            settings: {
                name: null,
                description: null,
                sourceCodeUrl: null,
                copyright: null,
                logo: null,
            },
        };
    }
};

export const actions: Actions = {
    update: async (event) => {
        const { request, locals, cookies } = event;
        const formData = await request.formData();
        const locale: string = cookies.get('PARAGLIDE_LOCALE') ?? 'fr';
        const redirectTo = `/${locale}/admin/organization`;

        const multipart = new FormData();

        const name = formData.get('name');
        const description = formData.get('description');
        const sourceCodeUrl = formData.get('sourceCodeUrl');
        const copyright = formData.get('copyright');
        const removeLogo = toBoolean(formData.get('removeLogo'));
        const logo = formData.get('logo');

        if (name !== null) multipart.append('name', name.toString());
        if (description !== null) multipart.append('description', description.toString());
        if (sourceCodeUrl !== null) multipart.append('sourceCodeUrl', sourceCodeUrl.toString());
        if (copyright !== null) multipart.append('copyright', copyright.toString());
        if (removeLogo) multipart.append('removeLogo', 'true');
        if (!removeLogo && logo instanceof File && logo.size > 0) {
            multipart.append('logo', logo, logo.name);
        }

        try {
            const { data } = await locals.client.post<{ message?: string }>('api/admin/organization', multipart);

            throw flashRedirect(
                303,
                redirectTo,
                {
                    type: 'success',
                    message: data?.message ?? 'Organization profile updated successfully',
                },
                event
            );
        } catch (error: any) {
            if (error?.status && error?.location) {
                throw error;
            }

            const apiError = error?.response?.data;
            const message = typeof apiError?.error === 'string' ? apiError.error : 'Unable to update organization profile';

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
