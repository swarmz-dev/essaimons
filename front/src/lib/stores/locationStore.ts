import { get, writable, type Writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { language } from '#lib/stores/languageStore';
import { page } from '$app/state';

export const location: Writable<string> = writable('');

export async function navigate(path: string, options = {}): Promise<void> {
    const normalizedPath: string = path.startsWith(`/${get(language)}`) ? path : `/${get(language)}${path}`;

    if (page.url.pathname !== normalizedPath) {
        location.set(normalizedPath);
        await goto(normalizedPath, { invalidateAll: true, ...options });
    }
}
