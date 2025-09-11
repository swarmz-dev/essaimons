import { type Writable, writable } from 'svelte/store';

export type LanguageCode = 'en' | 'fr';

export const language: Writable<LanguageCode> = writable('en');
