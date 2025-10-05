import { PUBLIC_API_REAL_URI } from '$env/static/public';

export interface PushDevice {
    id: string;
    endpoint: string;
    userAgent: string;
    active: boolean;
    lastUsedAt: string;
    createdAt: string;
}

export interface PushSubscriptionsResponse {
    subscriptions: PushDevice[];
}

class PushSubscriptionService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = PUBLIC_API_REAL_URI;
    }

    private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const headers = new Headers(options?.headers);

        // Add Authorization header with token from cookie
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

        // Handle 204 No Content
        if (response.status === 204) {
            return {} as T;
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
     * Get all push subscriptions for current user
     */
    async getSubscriptions(): Promise<PushDevice[]> {
        const data = await this.fetchAPI<any>('/api/push-subscriptions');
        return data.data?.subscriptions || [];
    }

    /**
     * Delete a push subscription
     */
    async deleteSubscription(id: string): Promise<void> {
        await this.fetchAPI(`/api/push-subscriptions/${id}`, {
            method: 'DELETE',
        });
    }
}

export const pushSubscriptionService = new PushSubscriptionService();
