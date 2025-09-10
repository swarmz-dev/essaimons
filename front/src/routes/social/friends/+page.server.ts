import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const response: Response = await fetch('/social/friends');
    const { isSuccess, friends } = await response.json();

    return isSuccess && response.ok ? { isSuccess, friends } : { isSuccess: false };
};
