import { type Writable, writable } from 'svelte/store';
import { type SerializedPendingFriend } from 'backend/types';

interface Notifications {
    friendRequests: SerializedPendingFriend[];
}

export const notifications: Writable<Notifications> = writable({
    friendRequests: [],
});

export function updateNotifications(data: SerializedPendingFriend[], type: keyof Notifications): void {
    notifications.update((current: Notifications): Notifications => {
        return {
            ...current,
            [type]: data,
        };
    });
}

export function addNotification(notification: SerializedPendingFriend, type: keyof Notifications): void {
    notifications.update((current: Notifications): Notifications => {
        return {
            ...current,
            [type]: [...(current[type] || []), notification],
        };
    });
}

export function removeNotification(notification: SerializedPendingFriend, type: keyof Notifications): void {
    notifications.update((current: Notifications): Notifications => {
        if (!current[type]) {
            return current;
        }

        return {
            ...current,
            [type]: current[type].filter((item: SerializedPendingFriend): boolean => {
                return item.id !== notification.id;
            }),
        };
    });
}

export async function setPendingFriendRequests(): Promise<void> {
    // const { data } = await axios.get('/api/notifications/pending-friends?perPage=99');
    // updateNotifications(data.notifications.notifications, 'friendRequests');
}
