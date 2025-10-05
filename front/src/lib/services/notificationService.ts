import { PUBLIC_API_REAL_URI } from '$env/static/public';

export interface Notification {
    id: string;
    type: string;
    titleKey: string;
    messageKey: string;
    data: Record<string, any>;
    entityType: string | null;
    entityId: string | null;
    actionUrl: string | null;
    createdAt: string;
    isRead: boolean;
    readAt: string | null;
}

export interface NotificationListResponse {
    notifications: Notification[];
    meta: {
        total: number;
        perPage: number;
        currentPage: number;
        lastPage: number;
    };
}

export interface NotificationRecipient {
    userId: string;
    username: string;
    email: string;
    read: boolean;
    readAt: string | null;
    inAppSent: boolean;
    emailSent: boolean;
    pushSent: boolean;
    emailError: string | null;
    pushError: string | null;
}

export interface AdminNotification {
    id: string;
    type: string;
    titleKey: string;
    bodyKey: string;
    interpolationData: Record<string, any>;
    actionUrl: string | null;
    priority: string;
    createdAt: string;
    recipients: NotificationRecipient[];
}

export interface AdminNotificationListResponse {
    notifications: AdminNotification[];
    meta: {
        total: number;
        perPage: number;
        currentPage: number;
        lastPage: number;
    };
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export class NotificationService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = PUBLIC_API_REAL_URI;
    }

    private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const headers = new Headers(options?.headers);

        // Add Authorization header with token from cookie (same pattern as requestService)
        if (typeof window !== 'undefined') {
            const token = this.getCookie('client_token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    private getCookie(name: string): string | null {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    /**
     * Get paginated notifications for current user
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationListResponse> {
        const data = await this.fetchAPI<any>(`/api/notifications?page=${page}&limit=${limit}`);
        return data.data || { notifications: [], meta: { total: 0, perPage: limit, currentPage: page, lastPage: 1 } };
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        const data = await this.fetchAPI<any>('/api/notifications/unread-count');
        return data.data?.unreadCount || 0;
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        await this.fetchAPI(`/api/notifications/${notificationId}/read`, {
            method: 'PATCH',
        });
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        await this.fetchAPI('/api/notifications/mark-all-read', {
            method: 'PATCH',
        });
    }

    /**
     * Get all notifications (admin only)
     */
    async getAdminNotifications(page: number = 1, limit: number = 50): Promise<AdminNotificationListResponse> {
        const data = await this.fetchAPI<any>(`/api/admin/notifications?page=${page}&limit=${limit}`);
        return data || { notifications: [], meta: { total: 0, perPage: limit, currentPage: page, lastPage: 1 } };
    }
}
