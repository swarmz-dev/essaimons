<script lang="ts">
    interface Props {
        isLoading?: boolean;
    }

    let { isLoading = false }: Props = $props();
</script>

{#if isLoading}
    <div class="fixed inset-0 flex items-center justify-center bg-black/50 z[9999]">
        <div class="rounded-full w-12 h-12 border-4 border-transparent border-t-primary-500 animate-spin"></div>
    </div>
{/if}

<style>
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
