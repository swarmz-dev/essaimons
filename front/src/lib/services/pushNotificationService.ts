import { PUBLIC_API_REAL_URI } from '$env/static/public';

export class PushNotificationService {
    private baseUrl: string;
    private registration: ServiceWorkerRegistration | null = null;

    constructor() {
        this.baseUrl = PUBLIC_API_REAL_URI;
    }

    /**
     * Check if push notifications are supported
     */
    isSupported(): boolean {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    }

    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission {
        return Notification.permission;
    }

    /**
     * Register service worker
     */
    async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
        if (!this.isSupported()) {
            console.warn('Push notifications are not supported');
            return null;
        }

        try {
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', this.registration);
            return this.registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }

    /**
     * Request notification permission and subscribe
     */
    async requestPermissionAndSubscribe(): Promise<PushSubscription | null> {
        if (!this.isSupported()) {
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Ensure service worker is registered
        if (!this.registration) {
            this.registration = await this.registerServiceWorker();
            if (!this.registration) {
                return null;
            }
        }

        // Subscribe to push
        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: await this.getVapidPublicKey(),
            });

            // Send subscription to backend
            await this.saveSubscription(subscription);

            console.log('Push subscription successful:', subscription);
            return subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }

    /**
     * Get current subscription
     */
    async getSubscription(): Promise<PushSubscription | null> {
        if (!this.registration) {
            this.registration = await navigator.serviceWorker.ready;
        }

        return this.registration.pushManager.getSubscription();
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe(): Promise<boolean> {
        const subscription = await this.getSubscription();
        if (!subscription) {
            return false;
        }

        try {
            await this.deleteSubscription(subscription);
            await subscription.unsubscribe();
            console.log('Unsubscribed from push notifications');
            return true;
        } catch (error) {
            console.error('Failed to unsubscribe:', error);
            return false;
        }
    }

    /**
     * Get VAPID public key from backend
     */
    private async getVapidPublicKey(): Promise<Uint8Array> {
        const response = await fetch(`${this.baseUrl}/api/push/vapid-public-key`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to get VAPID public key');
        }

        const { publicKey } = await response.json();
        return this.urlBase64ToUint8Array(publicKey);
    }

    /**
     * Save subscription to backend
     */
    private async saveSubscription(subscription: PushSubscription): Promise<void> {
        const token = this.getCookie('client_token');
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/push/subscribe`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save push subscription');
        }
    }

    /**
     * Delete subscription from backend
     */
    private async deleteSubscription(subscription: PushSubscription): Promise<void> {
        const token = this.getCookie('client_token');
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/push/unsubscribe`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                endpoint: subscription.endpoint,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete push subscription');
        }
    }

    /**
     * Helper to get cookie value
     */
    private getCookie(name: string): string | null {
        if (typeof window === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    }

    /**
     * Convert URL-safe base64 to Uint8Array
     */
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}
