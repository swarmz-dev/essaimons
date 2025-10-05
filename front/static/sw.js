// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    let notification;
    try {
        notification = event.data.json();
    } catch (error) {
        console.error('Failed to parse push data:', error);
        return;
    }

    const options = {
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/badge-72.png',
        data: notification.data,
        tag: notification.data?.notificationId || 'notification',
        requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(notification.title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
