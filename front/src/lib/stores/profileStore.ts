import { type Writable, writable } from 'svelte/store';
import { type SerializedUser } from 'backend/types';

export const profile: Writable<SerializedUser | null> = writable(null);

export function setProfile(user: SerializedUser): void {
    profile.set(user);
}

export function clearProfile(): void {
    profile.set(null);
}
