import { PUBLIC_API_REAL_URI } from '$env/static/public';

export interface NotificationSetting {
    id?: string;
    userId?: string;
    type?: string; // From API
    notificationType?: string; // Legacy field
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface NotificationSettingsResponse {
    settings: NotificationSetting[];
}

export interface UpdateSettingPayload {
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
}

export class NotificationSettingsService {
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
            const errorText = await response.text();
            console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
     * Get all notification settings for current user
     */
    async getSettings(): Promise<NotificationSetting[]> {
        const data = await this.fetchAPI<any>('/api/notification-settings');
        return data.settings || [];
    }

    /**
     * Update a specific notification type setting
     */
    async updateSetting(notificationType: string, payload: UpdateSettingPayload): Promise<NotificationSetting> {
        const data = await this.fetchAPI<any>(`/api/notification-settings/${notificationType}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return data.data?.setting;
    }

    /**
     * Bulk update multiple notification settings
     */
    async bulkUpdate(settings: Array<{ type: string } & UpdateSettingPayload>): Promise<NotificationSetting[]> {
        const data = await this.fetchAPI<any>('/api/notification-settings/bulk', {
            method: 'PUT',
            body: JSON.stringify({ settings }),
        });
        return data.settings || [];
    }
}
