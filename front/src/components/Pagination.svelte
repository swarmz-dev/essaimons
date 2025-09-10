<script lang="ts">
    import { Button } from '#lib/components/ui/button/index';
    import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from '@lucide/svelte';

    interface PaginatedObject {
        currentPage: number;
        firstPage: number;
        lastPage: number;
        limit: number;
        total: number;
    }

    type Props = {
        paginatedObject: PaginatedObject;
        containerElement?: Window | HTMLElement;
        onChange: (page: number, limit: number) => void;
    };

    let { paginatedObject, containerElement = window, onChange }: Props = $props();

    const canGoBack: boolean = $derived(paginatedObject.currentPage > paginatedObject.firstPage);
    const canGoForward: boolean = $derived(paginatedObject.currentPage < paginatedObject.lastPage);

    const handleClick = async (page: number, limit: number): Promise<void> => {
        try {
            await onChange(page, limit);
        } catch (error: any) {
            console.error('Failed to fetch paginated data:', error);
        } finally {
            if (containerElement) {
                containerElement.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                });
            }
        }
    };
</script>

<div class="my-2 flex gap-3 justify-center" class:hidden={paginatedObject.lastPage === 1}>
    {#if paginatedObject.currentPage}
        <!-- First Page Footer -->
        <Button disabled={!canGoBack} onclick={() => handleClick(paginatedObject.firstPage, paginatedObject.limit)}>
            <ChevronsLeft class="size-6" />
        </Button>
        <!-- Previous Page Footer -->
        <Button disabled={!canGoBack} onclick={() => handleClick(paginatedObject.currentPage - 1, paginatedObject.limit)}>
            <ChevronLeft class="size-6" />
        </Button>
        <!-- Page Indicator -->
        <p>
            {paginatedObject.currentPage} / {paginatedObject.lastPage}
        </p>
        <!-- Next Page Footer -->
        <Button disabled={!canGoForward} onclick={() => handleClick(paginatedObject.currentPage + 1, paginatedObject.limit)}>
            <ChevronRight class="size-6" />
        </Button>
        <!-- Last Page Footer -->
        <Button disabled={!canGoForward} onclick={() => handleClick(paginatedObject.lastPage, paginatedObject.limit)}>
            <ChevronsRight class="size-6" />
        </Button>
    {/if}
</div>
