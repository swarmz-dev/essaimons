import { loadFlash, redirect } from 'sveltekit-flash-message/server';
import type { LayoutServerLoad } from './$types';
import { UserRoleEnum } from 'backend/types';
import { m } from '#lib/paraglide/messages';

export const load: LayoutServerLoad = loadFlash(async (event): Promise<void> => {
    const { cookies } = event;

    const user: string | undefined = cookies.get('user');
    if (!user || JSON.parse(user).role !== UserRoleEnum.ADMIN) {
        redirect(
            303,
            `/${cookies.get('PARAGLIDE_LOCALE')}`,
            {
                type: 'error',
                message: m['forbidden.title'](),
            },
            event
        );
    }
});
