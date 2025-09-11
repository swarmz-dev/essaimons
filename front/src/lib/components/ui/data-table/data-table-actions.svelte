<script lang="ts">
    import { Button } from '$lib/components/ui/button/index.js';
    import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '$lib/components/ui/dropdown-menu/index';
    import { EllipsisIcon, Trash, Pencil } from '@lucide/svelte';
    import { m } from '#lib/paraglide/messages';
    import { Link } from '#lib/components/ui/link/index.js';
    import { location, navigate } from '#lib/stores/locationStore';
    import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    } from '#lib/components/ui/alert-dialog';
    import { wrappedFetch } from '#lib/services/requestService';
    import { showToast } from '#lib/services/toastService';

    type Props = {
        id: string | number;
        onDelete?: (ids: string[]) => void;
        deleteTitle?: string;
        deleteText?: string;
    };

    let { id, onDelete, deleteTitle, deleteText }: Props = $props();

    let showModal: boolean = $state(false);
    const deletable: boolean = $state(!!(deleteTitle && deleteText));

    const handleDelete = async (): Promise<void> => {
        showModal = false;
        await wrappedFetch(`${$location}/delete`, { method: 'POST', body: { data: [id] } }, (data) => {
            const isSuccess: boolean = data.messages.map((status: { isSuccess: boolean; message: string; code: string }) => {
                showToast(status.message, status.isSuccess ? 'success' : 'error');
                return status.isSuccess;
            })[0];

            if (isSuccess) {
                onDelete?.([id]);
            }
        });
    };
</script>

<DropdownMenu>
    <DropdownMenuTrigger>
        {#snippet child({ props })}
            <Button {...props} variant="ghost" size="icon" class="size-12 flex justify-start items-center">
                <EllipsisIcon class="size-5" />
            </Button>
        {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent>
        <DropdownMenuItem>
            <Link href={`${$location}/edit/${id}`} class="flex gap-1 justify-start !p-0 w-full">
                <Pencil class="size-4" />
                {m['common.edit']()}
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!deletable} class="hover:underline underline-offset-4 flex gap-1 py-3" onclick={() => (showModal = true)}>
            <Trash class="size-4 text-red-500" />
            {m['common.delete']()}
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>

<AlertDialog open={showModal} onOpenChange={() => (showModal = false)}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>{m['common.cancel']()}</AlertDialogCancel>
            <AlertDialogAction onclick={handleDelete}>{m['common.continue']()}</AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
