import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const response: Response = await fetch('/social/blocked');
    const { isSuccess, blockedUsers } = await response.json();

    return isSuccess && response.ok ? { isSuccess, blockedUsers } : { isSuccess: false };
};
