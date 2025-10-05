<script lang="ts">
    import { toastStore, type Toast } from '$lib/stores/toastStore.svelte';
    import { X, CheckCircle, AlertCircle, Info, Bell } from '@lucide/svelte';
    import { fade, fly } from 'svelte/transition';

    interface Props {
        toast: Toast;
    }

    let { toast }: Props = $props();

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertCircle,
        notification: Bell,
    };

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
        error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
        info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
        notification: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
    };

    const Icon = icons[toast.type];
</script>

<div in:fly={{ x: 300, duration: 300 }} out:fade={{ duration: 200 }} class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg {colors[toast.type]}">
    <div class="p-4">
        <div class="flex items-start">
            <div class="shrink-0">
                <Icon class="size-5" />
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium">
                    {toast.title}
                </p>
                {#if toast.message}
                    <p class="mt-1 text-sm opacity-90">
                        {toast.message}
                    </p>
                {/if}
                {#if toast.actionUrl && toast.actionLabel}
                    <div class="mt-2">
                        <a href={toast.actionUrl} class="text-sm font-medium underline hover:no-underline" onclick={() => toastStore.dismiss(toast.id)}>
                            {toast.actionLabel}
                        </a>
                    </div>
                {/if}
            </div>
            <div class="ml-4 flex shrink-0">
                <button onclick={() => toastStore.dismiss(toast.id)} class="inline-flex rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2">
                    <span class="sr-only">Close</span>
                    <X class="size-5" />
                </button>
            </div>
        </div>
    </div>
</div>
