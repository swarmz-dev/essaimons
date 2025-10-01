import type { Actions, PageServerLoad } from './$types';
import type { SerializedOrganizationSettings } from 'backend/types';
import { redirect as flashRedirect } from 'sveltekit-flash-message/server';

export const load: PageServerLoad<{ settings: SerializedOrganizationSettings }> = async ({ locals }) => {
    try {
        const { data } = await locals.client.get<{ settings: SerializedOrganizationSettings }>('api/admin/organization');

        const fallbackSettings: SerializedOrganizationSettings = {
            fallbackLocale: 'en',
            locales: [],
            name: {},
            description: {},
            sourceCodeUrl: {},
            copyright: {},
            logo: null,
            propositionDefaults: {
                clarificationOffsetDays: 7,
                amendmentOffsetDays: 15,
                voteOffsetDays: 7,
                mandateOffsetDays: 15,
                evaluationOffsetDays: 30,
            },
            permissions: { perStatus: {} },
            permissionCatalog: { perStatus: {} },
            workflowAutomation: {
                deliverableRecalcCooldownMinutes: 10,
                evaluationAutoShiftDays: 14,
                nonConformityPercentThreshold: 10,
                nonConformityAbsoluteFloor: 5,
                revocationAutoTriggerDelayDays: 7,
                revocationCheckFrequencyHours: 24,
                deliverableNamingPattern: 'DELIV-{proposition}-{date}',
            },
        };

        return {
            settings: {
                ...fallbackSettings,
                ...data.settings,
                permissions: data.settings.permissions ?? fallbackSettings.permissions,
                permissionCatalog: data.settings.permissionCatalog ?? fallbackSettings.permissionCatalog,
                workflowAutomation: data.settings.workflowAutomation ?? fallbackSettings.workflowAutomation,
            },
        };
    } catch (error: any) {
        console.error('admin.organization.load.error', error?.response?.data ?? error);
        return {
            settings: {
                fallbackLocale: 'en',
                locales: [],
                name: {},
                description: {},
                sourceCodeUrl: {},
                copyright: {},
                logo: null,
                propositionDefaults: {
                    clarificationOffsetDays: 7,
                    amendmentOffsetDays: 15,
                    voteOffsetDays: 7,
                    mandateOffsetDays: 15,
                    evaluationOffsetDays: 30,
                },
                permissions: { perStatus: {} },
                permissionCatalog: { perStatus: {} },
                workflowAutomation: {
                    deliverableRecalcCooldownMinutes: 10,
                    evaluationAutoShiftDays: 14,
                    nonConformityPercentThreshold: 10,
                    nonConformityAbsoluteFloor: 5,
                    revocationAutoTriggerDelayDays: 7,
                    revocationCheckFrequencyHours: 24,
                    deliverableNamingPattern: 'DELIV-{proposition}-{date}',
                },
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

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                multipart.append(key, value, value.name);
            } else {
                multipart.append(key, value as string);
            }
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
            let message = 'Unable to update organization profile';

            if (typeof apiError?.error === 'string' && apiError.error.trim().length > 0) {
                message = apiError.error;
            } else if (Array.isArray(apiError?.errors) && apiError.errors.length > 0) {
                const firstMessage = apiError.errors.find((item: any) => typeof item?.message === 'string')?.message;
                if (firstMessage) {
                    message = firstMessage;
                }
            }

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
