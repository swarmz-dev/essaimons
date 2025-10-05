export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'notification';
    title: string;
    message?: string;
    duration?: number;
    actionUrl?: string;
    actionLabel?: string;
}

class ToastStore {
    toasts = $state<Toast[]>([]);

    show(toast: Omit<Toast, 'id'>) {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = {
            id,
            duration: 5000, // Default 5 seconds
            ...toast,
        };

        this.toasts.push(newToast);

        // Auto-dismiss after duration
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, newToast.duration);
        }

        return id;
    }

    dismiss(id: string) {
        this.toasts = this.toasts.filter((t) => t.id !== id);
    }

    dismissAll() {
        this.toasts = [];
    }
}

export const toastStore = new ToastStore();
