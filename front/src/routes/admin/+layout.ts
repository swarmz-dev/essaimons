import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async (): Promise<{ isAdmin: true }> => {
    return {
        isAdmin: true,
    };
};
