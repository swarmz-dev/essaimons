import type { Notification } from '$lib/services/notificationService';

class NotificationStore {
    notifications = $state<Notification[]>([]);
    unreadCount = $state<number>(0);
    isOpen = $state<boolean>(false);

    addNotification(notification: Notification) {
        this.notifications.unshift(notification);
        if (!notification.isRead) {
            this.unreadCount++;
        }
    }

    markAsRead(notificationId: string) {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
            this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
    }

    markAllAsRead() {
        this.notifications.forEach((n) => {
            if (!n.isRead) {
                n.isRead = true;
                n.readAt = new Date().toISOString();
            }
        });
        this.unreadCount = 0;
    }

    setNotifications(notifications: Notification[]) {
        this.notifications = notifications;
    }

    setUnreadCount(count: number) {
        this.unreadCount = count;
    }

    toggleDropdown() {
        this.isOpen = !this.isOpen;
    }

    closeDropdown() {
        this.isOpen = false;
    }
}

export const notificationStore = new NotificationStore();
