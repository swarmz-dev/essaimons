import type { LayoutLoad } from './$types';
import { setProfile } from '#lib/stores/profileStore';
import { language } from '#lib/stores/languageStore';
import { location } from '#lib/stores/locationStore';

export const load: LayoutLoad = async ({ data }): Promise<void> => {
    if (data.user) {
        setProfile(data.user);
    }

    language.set(data.language);
    location.set(data.location);
};
