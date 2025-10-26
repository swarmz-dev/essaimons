<script lang="ts">
    import { enhance } from '$app/forms';
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { page } from '$app/state';
    import type { PageDataError } from '../../../app';
    import { showToast } from '#lib/services/toastService';
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
    import { location, navigate } from '#lib/stores/locationStore';
    import type { Snippet } from 'svelte';
    import type { SubmitFunction } from '@sveltejs/kit';

    type Props = {
        children: Snippet;
        id?: string | number;
        canSubmit: boolean;
        deleteTitle?: string;
        deleteText?: string;
        onError?: () => void;
        onBeforeSubmit?: (formData: FormData) => void;
    };

    let { children, id, canSubmit, deleteTitle, deleteText, onError, onBeforeSubmit }: Props = $props();

    let showModal: boolean = $state(false);
    let isSubmitting: boolean = $state(false);

    const handleDelete = async (): Promise<void> => {
        showModal = false;
        await wrappedFetch(`${$location.replace(`/edit/${id}`, '')}/delete`, { method: 'POST', body: { data: [id] } }, (data) => {
            const isSuccess: boolean = data.messages.map((status: { isSuccess: boolean; message: string; code: string }) => {
                showToast(status.message, status.isSuccess ? 'success' : 'error');
                return status.isSuccess;
            })[0];

            if (isSuccess) {
                navigate(`${$location.replace(`/edit/${id}`, '')}`);
            }
        });
    };

    const submitHandler: SubmitFunction<Record<string, any>, Record<string, any>> = async ({ formData }) => {
        isSubmitting = true;

        // Call the custom handler to modify formData before submission
        if (onBeforeSubmit) {
            onBeforeSubmit(formData);
        }

        return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'failure') {
                await update({ reset: false });
            } else {
                await update();
            }
        };
    };

    $effect((): void => {
        if (!page.data.formError) {
            return;
        }
        page.data.formError?.errors.forEach((error: PageDataError) => {
            showToast(error.message, error.type);
        });
        page.data.formError = undefined;
        onError?.();
    });
</script>

<form use:enhance={submitHandler} method="POST" enctype="multipart/form-data" class="pt-8 flex flex-col gap-8 rounded-lg shadow-md mt-5 p-3 bg-gray-300 dark:bg-gray-700">
    {@render children?.()}
    <div class="w-full flex justify-end gap-5 pr-5">
        {#if id}
            <Button variant="destructive" onclick={() => (showModal = true)}>
                {m['common.delete']()}
            </Button>
        {/if}
        <Button type="submit" variant="secondary" disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
            {m[`common.${id ? 'update' : 'create'}`]()}
        </Button>
    </div>
</form>

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
